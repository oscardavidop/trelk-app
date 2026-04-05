import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from './schemas/command-rating.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { ReviewModerationService } from '../moderation/review-moderation.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { CacheInvalidationService } from '../../core/resilience/cache-invalidation.service';
import { BOT_COMMANDS } from '../../data/bot-commands';
import { STATS_TTL, RATING_LIMIT, SPAM_BLACKLIST } from '../../common/constants/command-stats.constants';
import { AppError, ErrorCode } from 'src/common/errors';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    private readonly redis: RedisCacheService,
    private readonly moderation: ReviewModerationService,
    private readonly userStats: UserStatsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async getRatingStats(command: string): Promise<{ avg: number; count: number }> {
    const cacheKey = `command:rating:${command}`;
    const cached = await this.redis.get<{ avg: number; count: number; sum: number }>(cacheKey);
    if (cached) return { avg: cached.avg, count: cached.count };

    const agg = await this.ratingModel.aggregate([
      { $match: { command } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 }, sum: { $sum: '$rating' } } },
    ]).exec();

    const result = agg[0] ?? { avg: 0, count: 0, sum: 0 };
    const rounded = { avg: Math.round(result.avg * 100) / 100, count: result.count, sum: result.sum };
    await this.redis.set(cacheKey, rounded, STATS_TTL);
    return rounded;
  }

  async getMyRating(userId: number, command: string): Promise<{ rating: number | null; review: string | null; feedback: 'useful' | 'not_useful' | null; reason: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' | null; status: string | null }> {
    const doc = await this.ratingModel
      .findOne({ userId, command: command.toLowerCase().trim() })
      .lean()
      .exec();
    return doc
      ? {
        rating: doc.rating,
        review: (doc as any).review ?? null,
        feedback: (doc as any).feedback ?? null,
        reason: (doc as any).reason ?? null,
        status: (doc as any).status ?? 'approved',
      }
      : { rating: null, review: null, feedback: null, reason: null, status: null };
  }

  async rate(userId: number, command: string, rating: number, review?: string, context?: { args?: string; resultPreview?: string }): Promise<{ status: string }> {
    const cmd = command.toLowerCase().trim();

    const cmdExists = BOT_COMMANDS.some((c: any) =>
      c.uniqueName === cmd ||
      (Array.isArray(c.name) && c.name.some((n: string) => n.toLowerCase() === cmd)) ||
      (Array.isArray(c.alias) && c.alias.some((a: string) => a.toLowerCase() === cmd))
    );
    if (!cmdExists) {
      throw new BadRequestException('Invalid command');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }

    if (review !== undefined && review !== null) {
      const trimmed = review.trim();
      if (trimmed.length > 500) throw new BadRequestException('Review max 500 chars');
    }

    if (this.moderation.isEnabled) {
      // const blocked = await this.moderation.isUserBlocked(userId);
      // if (blocked) {
      //   throw new HttpException({ statusCode: HttpStatus.FORBIDDEN, error_key: 'reviews_error_blocked', message: 'Blocked' }, HttpStatus.FORBIDDEN);
      // }
    }

    await this.checkRateLimit(`rate:rating:${userId}`, RATING_LIMIT, 3600);

    const now = Date.now();
    const updateData: any = {
      rating,
      updatedAt: now,
    };

    const reviewText = review?.trim() || undefined;
    if (review !== undefined) {
      updateData.review = reviewText;
    }

    let reviewStatus: 'pending' | 'approved' = 'approved';
    if (this.moderation.isEnabled && reviewText) {
      reviewStatus = 'pending';
      const preFlags = this.moderation.detectPreModFlags(reviewText);
      if (preFlags.length > 0) {
        updateData.isSuspicious = true;
        updateData.spamScore = Math.min(preFlags.reduce((a, f) => a + f.score * 100, 0), 100);
      }
    }
    updateData.status = reviewStatus;

    const { score: trustScore, badge } = await this.userStats.computeTrustScore(userId);
    updateData.trustScoreSnapshot = trustScore;
    updateData.badge = badge;
    updateData.isVerified = trustScore > 30;
    updateData.isTrustedUser = trustScore >= 60;

    if (!updateData.spamScore) {
      const spamScore = await this.detectSpam(userId, reviewText, cmd);
      updateData.spamScore = spamScore;
      updateData.isSuspicious = spamScore > 60;
    }

    if (context?.args || context?.resultPreview) {
      updateData.commandContext = {
        args: context.args ? context.args.slice(0, 100) : undefined,
        resultPreview: context.resultPreview ? context.resultPreview.slice(0, 200) : undefined,
      };
    } else {
      const lastUsage = await this.historyModel.findOne(
        { userId: userId, command: cmd },
        { args: 1, command: 1 },
        { sort: { timestamp: -1 } },
      ).lean().exec();
      if (lastUsage) {
        updateData.commandContext = {
          args: (lastUsage as any).args?.slice(0, 100) || undefined,
          resultPreview: undefined,
        };
      }
    }

    const existing = await this.ratingModel.findOne({ userId, command: cmd }).lean().exec();
    const isEdit = !!(existing && (existing as any).review);

    if (isEdit && (existing as any).status === 'pending') {
      throw new AppError(ErrorCode.REVIEW_EDIT_PENDING, 'Edit blocked while review is pending', 409);
    }

    if (isEdit) {
      updateData.isEdited = true;
      if (reviewText && reviewText !== (existing as any).review) {
        updateData.moderationScore = null;
        updateData.moderationReasons = [];
        updateData.moderationRejectionKey = null;
        updateData.isFlagged = false;
        updateData.moderationMeta = null;
      }
    }

    const $setOnInsert: any = { createdAt: now, helpfulCount: 0 };
    if (!isEdit) $setOnInsert.isEdited = false;

    const saved = await this.ratingModel.findOneAndUpdate(
      { userId, command: cmd },
      { $set: updateData, $setOnInsert },
      { upsert: true, new: true },
    ).exec();

    if (saved) {
      const impactScore = this.computeImpactScore(saved as any);
      await this.ratingModel.updateOne({ _id: saved._id }, { $set: { impactScore } });
    }

    if (reviewStatus === 'pending' && saved && reviewText) {
      this.moderation.enqueueModeration({
        reviewId: (saved as any)._id.toString(),
        content: reviewText,
        userId,
        command: cmd,
      }).catch((err) => this.logger.warn(`Moderation enqueue failed: ${(err as Error).message}`));
    }

    await this.cacheInvalidation.emit({ type: 'rating_submitted', command: cmd, userId });

    if (reviewText) {
      this.moderation.enqueueAISummary(cmd).catch(() => {});
    }

    return { status: reviewStatus };
  }

  async submitFeedback(
    userId: number,
    command: string,
    useful: boolean,
    reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing',
  ): Promise<void> {
    const cmd = command.toLowerCase().trim();

    if (!useful && !reason) {
      throw new BadRequestException('reason required when useful=false');
    }

    if (reason && !['didnt_work', 'too_slow', 'bad_results', 'confusing'].includes(reason)) {
      throw new BadRequestException('Invalid reason');
    }

    await this.checkRateLimit(`rate:feedback:${userId}`, RATING_LIMIT, 3600);

    const now = Date.now();
    await this.ratingModel.findOneAndUpdate(
      { userId, command: cmd },
      {
        $set: {
          feedback: useful ? 'useful' : 'not_useful',
          reason: useful ? undefined : reason,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    ).exec();

    await this.cacheInvalidation.emit({ type: 'feedback_submitted', command: cmd });
  }

  computeImpactScore(review: { helpfulCount?: number; isVerified?: boolean; trustScoreSnapshot?: number; createdAt?: number }): number {
    const helpful = (review.helpfulCount || 0) * 2;
    const verified = review.isVerified ? 5 : 0;
    const trust = review.trustScoreSnapshot || 0;

    const ageMs = Date.now() - (review.createdAt || 0);
    const ageHours = ageMs / 3600_000;
    let recency = 0;
    if (ageHours < 24) recency = 5;
    else if (ageHours < 168) recency = 3;
    else if (ageHours < 720) recency = 1;

    return helpful + verified + trust + recency;
  }

  private async detectSpam(userId: number, comment: string | undefined, command: string): Promise<number> {
    let spamScore = 0;
    if (!comment) return 0;

    const lower = comment.toLowerCase().trim();

    if (lower.length < 15) {
      const matchesBlacklist = SPAM_BLACKLIST.some(w => lower.includes(w));
      if (matchesBlacklist) spamScore += 30;
    }

    const freqKey = `spam:freq:${userId}`;
    const freq = await this.redis.get<number>(freqKey);
    if (freq !== null && freq >= 3) spamScore += 50;
    await this.redis.set(freqKey, (freq ?? 0) + 1, freq === null ? 300 : undefined);

    const recentReviews = await this.ratingModel
      .find({ userId, review: { $exists: true, $ne: '' } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('review')
      .lean()
      .exec();

    for (const r of recentReviews) {
      const prev = ((r as any).review || '').toLowerCase().trim();
      if (prev && this.textSimilarity(lower, prev) > 0.9) {
        spamScore += 40;
        break;
      }
    }

    return Math.min(spamScore, 100);
  }

  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    let intersection = 0;
    for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private async checkRateLimit(key: string, max: number, windowSec: number) {
    if (!this.redis.available) return;

    const current = await this.redis.get<number>(key);
    if (current !== null && current >= max) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many requests, please try again later', 429);
    }

    const next = (current ?? 0) + 1;
    await this.redis.set(key, next, current === null ? windowSec : undefined);
  }
}
