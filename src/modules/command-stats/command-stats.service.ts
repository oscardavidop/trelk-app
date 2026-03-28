import { Injectable, Logger, BadRequestException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { CommandRating, CommandRatingDocument } from './schemas/command-rating.schema';
import { CommandReport, CommandReportDocument } from './schemas/command-report.schema';
import { ReviewHelpful, ReviewHelpfulDocument } from './schemas/review-helpful.schema';
import { ReviewReply, ReviewReplyDocument } from './schemas/review-reply.schema';
import { ReplyHelpful, ReplyHelpfulDocument } from './schemas/reply-helpful.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteDocument } from '../command-favorites/schemas/command-favorite.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ReviewSummary, ReviewSummaryDocument } from './schemas/review-summary.schema';
import { ReportEvent, ReportEventDocument } from './schemas/report-event.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { ReportUploadService } from './services/report-upload.service';
import { ReviewModerationService } from './services/review-moderation.service';
import { BOT_COMMANDS } from '../../data/commands';

const STATS_TTL = 120;       // 2min cache for aggregated stats
const WEEKLY_TTL = 3600;      // 60min cache for weekly usage
const RATING_LIMIT = 10;     // max ratings per hour
const REPORT_LIMIT = 5;      // max reports per 10 minutes
const REPORT_DEDUP_TTL = 86400; // 24h dedup window
const REVIEW_SUMMARY_TTL = 60; // 60s cache for review summary
const REVIEW_DAILY_LIMIT = 5;  // max reviews per day
const SUMMARY_TEXT_TTL = 600;  // 10min cache for AI summary text

const SPAM_BLACKLIST = ['muy bueno', 'good', 'nice', 'ok', 'excelente', 'great', 'cool', 'genial', 'perfecto', 'perfect', 'awesome', 'bueno', 'malo', 'bad'];

type Badge = 'power_user' | 'active_user' | 'new_user';

@Injectable()
export class CommandStatsService {
  private readonly logger = new Logger(CommandStatsService.name);
  private readonly botToken: string;
  private readonly adminChatId: string;
  private readonly apiUrl: string;
  private readonly adminIds: Set<number>;



  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(CommandReport.name) private readonly reportModel: Model<CommandReportDocument>,
    @InjectModel(ReviewHelpful.name) private readonly helpfulModel: Model<ReviewHelpfulDocument>,
    @InjectModel(ReviewReply.name) private readonly replyModel: Model<ReviewReplyDocument>,
    @InjectModel(ReplyHelpful.name) private readonly replyHelpfulModel: Model<ReplyHelpfulDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(CommandFavorite.name) private readonly favModel: Model<CommandFavoriteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ReviewSummary.name) private readonly reviewSummaryModel: Model<ReviewSummaryDocument>,
    @InjectModel(ReportEvent.name) private readonly reportEventModel: Model<ReportEventDocument>,
    private readonly redis: RedisCacheService,
    private readonly configService: ConfigService,
    private readonly reportUpload: ReportUploadService,
    private readonly moderation: ReviewModerationService,
  ) {
    this.botToken = this.configService.get<string>('BOT_TOKEN', '');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID', '');
    this.apiUrl = this.configService.get<string>('TELEGRAM_API_URL') || 'https://api.telegram.org';
    const adminIdsStr = this.configService.get<string>('ADMIN_IDS', '');
    this.adminIds = new Set(adminIdsStr.split(',').map(Number).filter(Boolean));
  }

  // ════════════════════════════════════════════════
  // AGGREGATED STATS
  // ════════════════════════════════════════════════

  async getStats(command: string) {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `command:stats:${cmd}`;

    const cached = await this.redis.get<CommandStatsResult>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [ratingAgg, weeklyUses, favorites] = await Promise.all([
      this.getRatingStats(cmd),
      this.historyModel.countDocuments({
        command: cmd,
        type: 'command',
        timestamp: { $gte: weekAgo },
      }).exec(),
      this.favModel.countDocuments({ command: cmd }).exec(),
    ]);

    const result: CommandStatsResult = {
      rating: ratingAgg.avg,
      ratingsCount: ratingAgg.count,
      weeklyUses,
      favorites,
    };

    await this.redis.set(cacheKey, result, STATS_TTL);
    return result;
  }

  // async getRankings(trendingLimit = 6, popularLimit = 6): Promise<CommandRankingsResult> {
  //   const safeTrending = Math.min(Math.max(trendingLimit || 6, 1), 30);
  //   const safePopular = Math.min(Math.max(popularLimit || 6, 1), 30);
  //   const cacheKey = `command:rankings:${safeTrending}:${safePopular}`;

  //   const cached = await this.redis.get<CommandRankingsResult>(cacheKey);
  //   if (cached) return cached;

  //   const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  //   const [weeklyRows, favoriteRows] = await Promise.all([
  //     this.historyModel.aggregate<{ _id: string; weeklyUses: number }>([
  //       {
  //         $match: {
  //           type: 'command',
  //           timestamp: { $gte: weekAgo },
  //           command: { $exists: true, $ne: null },
  //         },
  //       },
  //       { $project: { command: { $toLower: '$command' } } },
  //       { $match: { command: { $ne: '' } } },
  //       { $group: { _id: '$command', weeklyUses: { $sum: 1 } } },
  //     ]).exec(),
  //     this.favModel.aggregate<{ _id: string; favorites: number }>([
  //       { $match: { command: { $exists: true, $ne: null } } },
  //       { $project: { command: { $toLower: '$command' } } },
  //       { $match: { command: { $ne: '' } } },
  //       { $group: { _id: '$command', favorites: { $sum: 1 } } },
  //     ]).exec(),
  //   ]);

  //   const commandMap = new Map<string, { weeklyUses: number; favorites: number }>();

  //   for (const row of weeklyRows) {
  //     commandMap.set(row._id, { weeklyUses: row.weeklyUses, favorites: 0 });
  //   }

  //   for (const row of favoriteRows) {
  //     const existing = commandMap.get(row._id);
  //     if (existing) {
  //       existing.favorites = row.favorites;
  //     } else {
  //       commandMap.set(row._id, { weeklyUses: 0, favorites: row.favorites });
  //     }
  //   }

  //   const combined: RankingEntry[] = [...commandMap.entries()].map(([command, stats]) => {
  //     const trendingScore = stats.weeklyUses * 2 + stats.favorites;
  //     const popularScore = stats.weeklyUses + stats.favorites;
  //     return {
  //       command,
  //       weeklyUses: stats.weeklyUses,
  //       favorites: stats.favorites,
  //       trendingScore,
  //       popularScore,
  //     };
  //   });

  //   const result: CommandRankingsResult = {
  //     generatedAt: Date.now(),
  //     trending: [...combined]
  //       .sort((a, b) => b.trendingScore - a.trendingScore)
  //       .slice(0, safeTrending),
  //     popular: [...combined]
  //       .sort((a, b) => b.popularScore - a.popularScore)
  //       .slice(0, safePopular),
  //   };

  //   await this.redis.set(cacheKey, result, WEEKLY_TTL);
  //   return result;
  // }

  // ════════════════════════════════════════════════
  // RATING SYSTEM
  // ════════════════════════════════════════════════

  async getRankings(trendingLimit = 6, popularLimit = 6): Promise<CommandRankingsResult> {
    const safeTrending = Math.min(Math.max(trendingLimit || 6, 1), 30);
    const safePopular = Math.min(Math.max(popularLimit || 6, 1), 30);
    const cacheKey = `command:rankings:${safeTrending}:${safePopular}`;

    const cached = await this.redis.get<CommandRankingsResult>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [weeklyRows, favoriteRows] = await Promise.all([
      this.historyModel.aggregate<{ _id: string; weeklyUses: number }>([
        {
          $match: {
            type: 'command',
            timestamp: { $gte: weekAgo },
            // Filtramos nulos, indefinidos y strings vacíos de una vez usando índices
            command: { $type: 'string', $nin: ['', null] },
          },
        },
        {
          // Agrupamos y convertimos a minúsculas en un solo paso
          $group: {
            _id: { $toLower: '$command' },
            weeklyUses: { $sum: 1 }
          }
        },
      ]).exec(),

      this.favModel.aggregate<{ _id: string; favorites: number }>([
        {
          $match: {
            command: { $type: 'string', $nin: ['', null] }
          }
        },
        {
          $group: {
            _id: { $toLower: '$command' },
            favorites: { $sum: 1 }
          }
        },
      ]).exec(),
    ]);

    const commandMap = new Map<string, { weeklyUses: number; favorites: number }>();

    // Tu lógica de mapeo está perfecta y es muy rápida (O(N)), la mantenemos igual.
    for (const row of weeklyRows) {
      commandMap.set(row._id, { weeklyUses: row.weeklyUses, favorites: 0 });
    }

    for (const row of favoriteRows) {
      const existing = commandMap.get(row._id);
      if (existing) {
        existing.favorites = row.favorites;
      } else {
        commandMap.set(row._id, { weeklyUses: 0, favorites: row.favorites });
      }
    }

    const combined: RankingEntry[] = [...commandMap.entries()].map(([command, stats]) => {
      return {
        command,
        weeklyUses: stats.weeklyUses,
        favorites: stats.favorites,
        trendingScore: stats.weeklyUses * 2 + stats.favorites,
        popularScore: stats.weeklyUses + stats.favorites,
      };
    });

    // 1. Calcular trending primero
    const trending = [...combined]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, safeTrending);

    // 2. Crear un Set con los comandos de trending para búsqueda instantánea O(1)
    const trendingCommands = new Set(trending.map(t => t.command));

    // 3. Calcular popular filtrando los que ya están en trending
    const popular = combined
      .sort((a, b) => b.popularScore - a.popularScore)
      // Filtramos: que NO esté en el Set de trending
      .filter(item => !trendingCommands.has(item.command))
      .slice(0, safePopular);

    // 4. Armar el objeto final
    const result: CommandRankingsResult = {
      generatedAt: Date.now(),
      trending,
      popular
    };


    // Asumo que WEEKLY_TTL está definido en otra parte de tu archivo
    await this.redis.set(cacheKey, result, WEEKLY_TTL);
    return result;
  }

  /** Get aggregated rating stats from Redis cache or Mongo */
  private async getRatingStats(command: string): Promise<{ avg: number; count: number }> {
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

  /** Get user's own rating/feedback for a command */
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

  /** Submit or update a rating */
  async rate(userId: number, command: string, rating: number, review?: string, context?: { args?: string; resultPreview?: string }): Promise<{ status: string }> {
    const cmd = command.toLowerCase().trim();

    // Validate command exists in commands.json
    const cmdExists = BOT_COMMANDS.some((c: any) =>
      c.uniqueName === cmd ||
      (Array.isArray(c.name) && c.name.some((n: string) => n.toLowerCase() === cmd)) ||
      (Array.isArray(c.alias) && c.alias.some((a: string) => a.toLowerCase() === cmd))
    );
    if (!cmdExists) {
      throw new BadRequestException('Invalid command');
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be 1-5');
    }

    // Validate review
    if (review !== undefined && review !== null) {
      const trimmed = review.trim();
      if (trimmed.length > 500) throw new BadRequestException('Review max 500 chars');
    }

    // Check if user is blocked by moderation
    if (this.moderation.isEnabled) {
      // const blocked = await this.moderation.isUserBlocked(userId);
      // if (blocked) {
      //   throw new HttpException({ statusCode: HttpStatus.FORBIDDEN, error_key: 'reviews_error_blocked', message: 'Blocked' }, HttpStatus.FORBIDDEN);
      // }
    }

    // Rate limit: 10 ratings per hour
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

    // Determine moderation status
    let reviewStatus: 'pending' | 'approved' = 'approved';
    if (this.moderation.isEnabled && reviewText) {
      reviewStatus = 'pending';
      // Run pre-moderation detection
      const preFlags = this.moderation.detectPreModFlags(reviewText);
      if (preFlags.length > 0) {
        updateData.isSuspicious = true;
        updateData.spamScore = Math.min(preFlags.reduce((a, f) => a + f.score * 100, 0), 100);
      }
    }
    updateData.status = reviewStatus;

    // Compute trust score + badge
    const { score: trustScore, badge } = await this.computeTrustScore(userId);
    updateData.trustScoreSnapshot = trustScore;
    updateData.badge = badge;
    updateData.isVerified = trustScore > 30;
    updateData.isTrustedUser = trustScore >= 60;

    // Spam detection (existing internal system)
    if (!updateData.spamScore) {
      const spamScore = await this.detectSpam(userId, reviewText, cmd);
      updateData.spamScore = spamScore;
      updateData.isSuspicious = spamScore > 60;
    }

    // Command context: auto-fetch from history if not provided
    if (context?.args || context?.resultPreview) {
      updateData.commandContext = {
        args: context.args ? context.args.slice(0, 100) : undefined,
        resultPreview: context.resultPreview ? context.resultPreview.slice(0, 200) : undefined,
      };
    } else {
      // Auto-fetch last usage from history
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

    // Check if existing review to set isEdited
    const existing = await this.ratingModel.findOne({ userId, command: cmd }).lean().exec();
    const isEdit = !!(existing && (existing as any).review);

    // Block editing while review is pending moderation
    if (isEdit && (existing as any).status === 'pending') {
      throw new HttpException({ statusCode: HttpStatus.CONFLICT, error_key: 'reviews_error_edit_pending', message: 'Edit blocked' }, HttpStatus.CONFLICT);
    }

    if (isEdit) {
      updateData.isEdited = true;
      // Re-moderate if text changed on an already-moderated review
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

    // Enqueue moderation job if pending
    if (reviewStatus === 'pending' && saved && reviewText) {
      this.moderation.enqueueModeration({
        reviewId: (saved as any)._id.toString(),
        content: reviewText,
        userId,
        command: cmd,
      }).catch((err) => this.logger.warn(`Moderation enqueue failed: ${(err as Error).message}`));
    }

    // Invalidate caches
    await this.redis.del(`command:rating:${cmd}`);
    await this.redis.del(`command:stats:${cmd}`);
    await this.redis.del(`command:reviews:summary:${cmd}`);

    // Trigger AI summary regeneration (async, best-effort)
    if (reviewText) {
      this.moderation.enqueueAISummary(cmd).catch(() => {});
    }

    return { status: reviewStatus };
  }

  /** Submit useful / not-useful feedback and optional reason */
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

    await this.redis.del(`command:rating:${cmd}`);
    await this.redis.del(`command:stats:${cmd}`);
  }

  // ════════════════════════════════════════════════
  // REVIEWS SUMMARY
  // ════════════════════════════════════════════════

  async getReviewsSummary(command: string) {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `command:reviews:summary:${cmd}`;
    const cached = await this.redis.get<ReviewsSummary>(cacheKey);
    if (cached) return cached;

    const agg = await this.ratingModel.aggregate([
      { $match: { command: cmd, rating: { $exists: true, $gte: 1 }, $or: [{ status: 'approved' }, { status: { $exists: false } }] } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          // Weighted sum: rating * (trust/100) * suspiciousPenalty * flagPenalty
          weightedSum: {
            $sum: {
              $multiply: [
                '$rating',
                { $divide: [{ $ifNull: ['$trustScoreSnapshot', 50] }, 100] },
                { $cond: [{ $ifNull: ['$isSuspicious', false] }, 0.3, 1] },
                { $cond: [{ $ifNull: ['$isFlagged', false] }, 0.5, 1] },
              ],
            },
          },
          weightTotal: {
            $sum: {
              $multiply: [
                { $divide: [{ $ifNull: ['$trustScoreSnapshot', 50] }, 100] },
                { $cond: [{ $ifNull: ['$isSuspicious', false] }, 0.3, 1] },
                { $cond: [{ $ifNull: ['$isFlagged', false] }, 0.5, 1] },
              ],
            },
          },
        },
      },
    ]).exec();

    const row = agg[0];
    const weightedAvg = row && row.weightTotal > 0
      ? row.weightedSum / row.weightTotal
      : row?.totalReviews > 0 ? row.weightedSum / row.totalReviews : 0;

    const result: ReviewsSummary = row
      ? {
        avgRating: Math.round(weightedAvg * 10) / 10,
        totalReviews: row.totalReviews,
        distribution: { 5: row.star5, 4: row.star4, 3: row.star3, 2: row.star2, 1: row.star1 },
      }
      : { avgRating: 0, totalReviews: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    await this.redis.set(cacheKey, result, REVIEW_SUMMARY_TTL);
    return result;
  }

  // ════════════════════════════════════════════════
  // REVIEWS LIST (enhanced with filters, sort, cursor)
  // ════════════════════════════════════════════════

  async getReviews(command: string, limit = 10, offset = 0, sort: 'recent' | 'relevant' = 'recent', ratingFilter?: number, type?: 'positive' | 'negative', currentUserId?: number) {
    const cmd = command.toLowerCase().trim();
    const safeLimit = Math.min(Math.max(limit, 1), 30);

    const filter: any = {
      command: cmd,
      rating: { $exists: true, $gte: 1 }
    };

    // Only show approved reviews publicly; pending/rejected only visible to the author
    if (currentUserId) {
      filter.$or = [
        { status: 'approved' },
        { status: { $exists: false } },
        { userId: currentUserId },
      ];
    } else {
      filter.$or = [
        { status: 'approved' },
        { status: { $exists: false } },
      ];
    }

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      filter.rating = ratingFilter;
    } else if (type === 'positive') {
      filter.rating = { $gte: 4 };
    } else if (type === 'negative') {
      filter.rating = { $lte: 2 };
    }

    const sortObj = sort === 'relevant'
      ? { helpfulCount: -1 as const, updatedAt: -1 as const }
      : { updatedAt: -1 as const };

    const [items, total] = await Promise.all([
      this.ratingModel
        .find(filter)
        .sort(sortObj)
        .skip(Math.max(offset, 0))
        .limit(safeLimit)
        .select('userId rating review helpfulCount isEdited createdAt updatedAt trustScoreSnapshot badge isSuspicious commandContext repliesCount status isFlagged isVerified isTrustedUser isAIModerated')
        .lean()
        .exec(),
      this.ratingModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((r) => ({
        id: (r as any)._id.toString(),
        userId: r.userId,
        rating: r.rating,
        review: (r as any).review,
        helpfulCount: (r as any).helpfulCount ?? 0,
        isEdited: (r as any).isEdited ?? false,
        date: r.updatedAt,
        createdAt: r.createdAt,
        badge: (r as any).badge ?? 'new_user',
        trustScore: (r as any).trustScoreSnapshot ?? 0,
        isSuspicious: (r as any).isSuspicious ?? false,
        commandContext: (r as any).commandContext ?? undefined,
        repliesCount: (r as any).repliesCount ?? 0,
        status: (r as any).status ?? 'approved',
        isVerified: (r as any).isVerified ?? false,
        isTrustedUser: (r as any).isTrustedUser ?? false,
        isAIModerated: (r as any).isAIModerated ?? false,
      })),
      total,
      hasMore: Math.max(offset, 0) + items.length < total,
    };
  }

  // ════════════════════════════════════════════════
  // TOGGLE HELPFUL VOTE
  // ════════════════════════════════════════════════

  async toggleHelpful(userId: number, reviewId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');
    const oid = new Types.ObjectId(reviewId);

    const existing = await this.helpfulModel.findOne({ userId, reviewId: oid }).lean().exec();

    if (existing) {
      await this.helpfulModel.deleteOne({ _id: (existing as any)._id }).exec();
      const doc = await this.ratingModel.findByIdAndUpdate(
        oid,
        { $inc: { helpfulCount: -1 } },
        { new: true },
      ).select('helpfulCount').lean().exec();
      return { helpful: false, helpfulCount: Math.max((doc as any)?.helpfulCount ?? 0, 0) };
    } else {
      await this.helpfulModel.create({ userId, reviewId: oid, createdAt: Date.now() });
      const doc = await this.ratingModel.findByIdAndUpdate(
        oid,
        { $inc: { helpfulCount: 1 } },
        { new: true },
      ).select('helpfulCount').lean().exec();
      return { helpful: true, helpfulCount: (doc as any)?.helpfulCount ?? 1 };
    }
  }

  /** Check if user already voted helpful for given review ids */
  async getMyHelpfuls(userId: number, reviewIds: string[]): Promise<string[]> {
    const { Types } = await import('mongoose');
    const oids = reviewIds.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    if (!oids.length) return [];
    const docs = await this.helpfulModel.find({ userId, reviewId: { $in: oids } }).select('reviewId').lean().exec();
    return docs.map(d => d.reviewId.toString());
  }

  // ════════════════════════════════════════════════
  // MY REVIEW (full review data)
  // ════════════════════════════════════════════════

  async getMyReview(userId: number, command: string) {
    const cmd = command.toLowerCase().trim();
    const doc = await this.ratingModel.findOne({ userId, command: cmd }).lean().exec();
    if (!doc) return null;
    return {
      id: (doc as any)._id.toString(),
      rating: doc.rating,
      review: (doc as any).review ?? '',
      helpfulCount: (doc as any).helpfulCount ?? 0,
      isEdited: (doc as any).isEdited ?? false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      status: (doc as any).status ?? 'approved',
      moderationRejectionKey: (doc as any).moderationRejectionKey ?? null,
    };
  }

  // ════════════════════════════════════════════════
  // DELETE MY REVIEW
  // ════════════════════════════════════════════════

  async deleteReview(userId: number, command: string): Promise<void> {
    const cmd = command.toLowerCase().trim();
    const doc = await this.ratingModel.findOne({ userId, command: cmd }).lean().exec();
    if (!doc) throw new BadRequestException('No review found');

    // Cancel pending moderation job if review is being moderated
    if ((doc as any).status === 'pending') {
      await this.moderation.cancelJob((doc as any)._id.toString()).catch(() => { });
    }

    await this.ratingModel.deleteOne({ userId, command: cmd }).exec();

    // Clean up helpful votes for this review
    const reviewId = (doc as any)._id;
    await this.helpfulModel.deleteMany({ reviewId }).exec();
    await this.replyModel.deleteMany({ reviewId }).exec();

    // Invalidate caches
    await this.redis.del(`command:rating:${cmd}`);
    await this.redis.del(`command:stats:${cmd}`);
    await this.redis.del(`command:reviews:summary:${cmd}`);
  }

  /** Admin-only: delete any review by its mongo _id */
  async adminDeleteReview(adminUserId: number, reviewId: string): Promise<void> {
    if (!this.adminIds.has(adminUserId)) {
      throw new ForbiddenException('Admin only');
    }

    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');

    const oid = new Types.ObjectId(reviewId);
    const doc = await this.ratingModel.findById(oid).lean().exec();
    if (!doc) throw new BadRequestException('Review not found');

    await this.ratingModel.deleteOne({ _id: oid }).exec();
    await this.helpfulModel.deleteMany({ reviewId: oid }).exec();
    await this.replyModel.deleteMany({ reviewId: oid }).exec();

    const cmd = (doc as any).command;
    if (cmd) {
      await this.redis.del(`command:rating:${cmd}`);
      await this.redis.del(`command:stats:${cmd}`);
      await this.redis.del(`command:reviews:summary:${cmd}`);
    }
  }

  checkIsAdmin(userId: number): boolean {
    return this.adminIds.has(userId);
  }

  // ════════════════════════════════════════════════
  // REPORT REVIEW (spam/abuse)
  // ════════════════════════════════════════════════

  async reportReview(userId: number, reviewId: string, reason: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');

    // Rate limit
    await this.checkRateLimit(`rate:review-report:${userId}`, 5, 3600);

    // Dedup: one report per user per review
    const dedupKey = `review-report:${userId}:${reviewId}`;
    const existing = await this.redis.get<string>(dedupKey);
    if (existing) throw new BadRequestException('Already reported');

    await this.redis.set(dedupKey, '1', 86400); // 24h dedup

    // Notify admin
    this.notifyAdmin(
      `review:${reviewId}`,
      userId,
      'review_report',
      `Review reported as: ${reason}`,
    ).catch(() => { });
  }

  // ════════════════════════════════════════════════
  // USER INFO LOOKUP (batch)
  // ════════════════════════════════════════════════

  async getUserInfoBatch(userIds: number[]): Promise<Map<number, { firstName: string; lastName?: string; username?: string; photoUrl?: string }>> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map();

    const users = await this.userModel
      .find({ $or: [{ telegramId: { $in: unique } }, { id: { $in: unique } }] })
      .select('telegramId id firstName lastName username photoUrl')
      .lean()
      .exec();

    const map = new Map<number, { firstName: string; lastName?: string; username?: string; photoUrl?: string }>();
    for (const u of users) {
      const key = u.telegramId ?? (u as any).id;
      if (key) map.set(key, { firstName: u.firstName, lastName: u.lastName, username: u.username, photoUrl: u.photoUrl });
    }
    return map;
  }

  // ════════════════════════════════════════════════
  // TRUST SCORE COMPUTATION
  // ════════════════════════════════════════════════

  async computeTrustScore(userId: number): Promise<{ score: number; badge: Badge }> {
    const cacheKey = `trust:score:${userId}`;
    const cached = await this.redis.get<{ score: number; badge: Badge }>(cacheKey);
    if (cached) return cached;

    const [totalCommandsUsed, totalReviews, user] = await Promise.all([
      this.historyModel.countDocuments({ userId, type: 'command' }).exec(),
      this.ratingModel.countDocuments({ userId, rating: { $gte: 1 } }).exec(),
      this.userModel.findOne({ $or: [{ telegramId: userId }, { id: userId }] }).select('createdAt').lean().exec(),
    ]);

    const accountAgeDays = (user as any)?.createdAt
      ? Math.floor((Date.now() - new Date((user as any).createdAt).getTime()) / 86400000)
      : 0;

    const raw =
      Math.log(totalCommandsUsed + 1) * 20 +
      Math.log(totalReviews + 1) * 10 +
      Math.min(accountAgeDays / 30, 10) * 5;

    const score = Math.round(Math.min(Math.max(raw, 0), 100));
    const badge: Badge = score > 70 ? 'power_user' : score > 40 ? 'active_user' : 'new_user';

    const result = { score, badge };
    await this.redis.set(cacheKey, result, 3600); // 1h cache
    return result;
  }

  // ════════════════════════════════════════════════
  // ANTI-FRAUD / SPAM DETECTION
  // ════════════════════════════════════════════════

  private async detectSpam(userId: number, comment: string | undefined, command: string): Promise<number> {
    let spamScore = 0;
    if (!comment) return 0;

    const lower = comment.toLowerCase().trim();

    // Rule 1: generic blacklist + short text
    if (lower.length < 15) {
      const matchesBlacklist = SPAM_BLACKLIST.some(w => lower.includes(w));
      if (matchesBlacklist) spamScore += 30;
    }

    // Rule 2: check frequency — more than 3 reviews in 5 minutes
    const freqKey = `spam:freq:${userId}`;
    const freq = await this.redis.get<number>(freqKey);
    if (freq !== null && freq >= 3) spamScore += 50;
    await this.redis.set(freqKey, (freq ?? 0) + 1, freq === null ? 300 : undefined);

    // Rule 3: text similarity with user's recent reviews
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

  /** Simple Jaccard-like text similarity (word-level) */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    let intersection = 0;
    for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  // ════════════════════════════════════════════════
  // REPLY THREADS
  // ════════════════════════════════════════════════

  async submitReply(userId: number, reviewId: string, content: string): Promise<{ id: string; isAdmin: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');

    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 500) throw new BadRequestException('Reply must be 2-500 chars');

    await this.checkRateLimit(`rate:reply:${userId}`, 20, 3600);

    const isAdmin = this.adminIds.has(userId);
    const oid = new Types.ObjectId(reviewId);

    const reply = await this.replyModel.create({
      reviewId: oid,
      userId,
      isAdmin,
      content: trimmed,
      createdAt: Date.now(),
    });

    // Increment replies count on the review
    await this.ratingModel.updateOne({ _id: oid }, { $inc: { repliesCount: 1 } }).exec();

    return { id: (reply as any)._id.toString(), isAdmin };
  }

  async getReplies(reviewId: string, limit = 20, offset = 0, currentUserId?: number): Promise<{ items: any[]; total: number; hasMore: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid review id');
    const oid = new Types.ObjectId(reviewId);
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const isAdmin = currentUserId ? this.adminIds.has(currentUserId) : false;
    // Find the review to check ownership
    const review = await this.ratingModel.findById(oid).lean().exec();
    const isOwner = currentUserId && review ? (review as any).userId === currentUserId : false;

    // Admin and review owner see all replies (including hidden), others don't
    const filter: any = { reviewId: oid };
    if (!isAdmin && !isOwner) {
      filter.isHidden = { $ne: true };
    }

    const [items, total] = await Promise.all([
      this.replyModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(Math.max(offset, 0))
        .limit(safeLimit)
        .lean()
        .exec(),
      this.replyModel.countDocuments(filter).exec(),
    ]);

    // Get user info for reply authors
    const userIds = [...new Set(items.map(i => i.userId))];
    const userMap = userIds.length ? await this.getUserInfoBatch(userIds) : new Map();

    // Get current user's helpful votes for these replies
    const replyIds = items.map(r => (r as any)._id);
    const myReplyHelpfuls = currentUserId && replyIds.length
      ? (await this.replyHelpfulModel.find({ userId: currentUserId, replyId: { $in: replyIds } }).lean().exec()).map(h => h.replyId.toString())
      : [];

    return {
      items: items.map(r => {
        const u = userMap.get(r.userId);
        return {
          id: (r as any)._id.toString(),
          userId: r.userId,
          isAdmin: r.isAdmin,
          content: r.content,
          createdAt: r.createdAt,
          isHidden: r.isHidden ?? false,
          isEdited: r.isEdited ?? false,
          editedAt: r.editedAt,
          helpfulCount: r.helpfulCount ?? 0,
          myHelpful: myReplyHelpfuls.includes((r as any)._id.toString()),
          userName: u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : undefined,
          userPhoto: u?.photoUrl,
        };
      }),
      total,
      hasMore: Math.max(offset, 0) + items.length < total,
    };
  }

  async deleteReply(userId: number, replyId: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    await this.replyModel.deleteOne({ _id: oid }).exec();
    await this.replyHelpfulModel.deleteMany({ replyId: oid }).exec();

    // Decrement replies count on the review
    await this.ratingModel.updateOne({ _id: reply.reviewId }, { $inc: { repliesCount: -1 } }).exec();
  }

  async editReply(userId: number, replyId: string, content: string): Promise<void> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const trimmed = content.trim();
    if (trimmed.length < 2 || trimmed.length > 500) throw new BadRequestException('Reply must be 2-500 chars');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    await this.replyModel.updateOne({ _id: oid }, {
      $set: { content: trimmed, isEdited: true, editedAt: Date.now() },
    }).exec();
  }

  async hideReply(userId: number, replyId: string): Promise<{ isHidden: boolean }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');
    if (!this.adminIds.has(userId)) throw new ForbiddenException('Admin only');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    const newHidden = !(reply as any).isHidden;
    await this.replyModel.updateOne({ _id: oid }, { $set: { isHidden: newHidden } }).exec();
    return { isHidden: newHidden };
  }

  async toggleReplyHelpful(userId: number, replyId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
    const { Types } = await import('mongoose');
    if (!Types.ObjectId.isValid(replyId)) throw new BadRequestException('Invalid reply id');

    const oid = new Types.ObjectId(replyId);
    const reply = await this.replyModel.findById(oid).lean().exec();
    if (!reply) throw new BadRequestException('Reply not found');

    const existing = await this.replyHelpfulModel.findOne({ userId, replyId: oid }).lean().exec();
    if (existing) {
      await this.replyHelpfulModel.deleteOne({ _id: (existing as any)._id }).exec();
      await this.replyModel.updateOne({ _id: oid }, { $inc: { helpfulCount: -1 } }).exec();
      const updated = await this.replyModel.findById(oid).lean().exec();
      return { helpful: false, helpfulCount: Math.max(0, (updated as any)?.helpfulCount ?? 0) };
    } else {
      await this.replyHelpfulModel.create({ userId, replyId: oid, createdAt: Date.now() });
      await this.replyModel.updateOne({ _id: oid }, { $inc: { helpfulCount: 1 } }).exec();
      const updated = await this.replyModel.findById(oid).lean().exec();
      return { helpful: true, helpfulCount: (updated as any)?.helpfulCount ?? 1 };
    }
  }

  // ════════════════════════════════════════════════
  // AI SUMMARY TEXT
  // ════════════════════════════════════════════════

  async getReviewSummaryText(command: string): Promise<{
    text: string;
    pros: string[];
    cons: string[];
    sentiment: string;
    confidenceLevel: string;
    confidenceScore: number;
    trend: string;
    trendMessage: string;
    totalReviews: number;
    updatedAt: number | null;
    positiveCount: number;
    negativeCount: number;
  }> {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `summary:${cmd}`;

    // Try Redis cache first
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      return {
        text: cached.text || cached.summary || '',
        pros: cached.pros || [],
        cons: cached.cons || [],
        sentiment: cached.sentiment || 'neutral',
        confidenceLevel: cached.confidenceLevel || 'low',
        confidenceScore: cached.confidenceScore || 0,
        trend: cached.trend || 'none',
        trendMessage: cached.trendMessage || '',
        totalReviews: cached.totalReviews || 0,
        updatedAt: cached.updatedAt || null,
        positiveCount: (cached.pros || []).length,
        negativeCount: (cached.cons || []).length,
      };
    }

    // Try MongoDB
    const doc = await this.reviewSummaryModel.findOne({ commandSlug: cmd }).lean().exec();
    if (doc) {
      const result = {
        text: (doc as any).summary || '',
        pros: (doc as any).pros || [],
        cons: (doc as any).cons || [],
        sentiment: (doc as any).sentiment || 'neutral',
        confidenceLevel: (doc as any).confidenceLevel || 'low',
        confidenceScore: (doc as any).confidenceScore || 0,
        trend: (doc as any).trend || 'none',
        trendMessage: (doc as any).trendMessage || '',
        totalReviews: (doc as any).totalReviews || 0,
        updatedAt: (doc as any).updatedAt || null,
        positiveCount: ((doc as any).pros || []).length,
        negativeCount: ((doc as any).cons || []).length,
      };
      // Warm cache
      await this.redis.set(cacheKey, result, SUMMARY_TEXT_TTL);
      return result;
    }

    // No summary yet — trigger generation
    this.moderation.enqueueAISummary(cmd).catch(() => {});

    return {
      text: '', pros: [], cons: [], sentiment: 'neutral',
      confidenceLevel: 'low', confidenceScore: 0, trend: 'none',
      trendMessage: '', totalReviews: 0, updatedAt: null,
      positiveCount: 0, negativeCount: 0,
    };
  }

  // ════════════════════════════════════════════════
  // REPORT SYSTEM
  // ════════════════════════════════════════════════

  async uploadReportScreenshots(
    files: Array<{ filename: string; mimetype: string; data: Buffer }>,
  ): Promise<string[]> {
    if (!files.length) return [];
    return this.reportUpload.saveFiles(files);
  }

  async submitReport(
    userId: number,
    command: string,
    category: string,
    message: string,
    ip?: string,
    screenshots: string[] = [],
    userAgent?: string,
    appVersion?: string,
  ): Promise<{ ok: true }> {
    const cmd = command.toLowerCase().trim();
    const msg = message.trim();

    // Validate
    if (!['bug', 'wrong_result', 'crash', 'other'].includes(category)) {
      throw new BadRequestException('Invalid category');
    }
    if (msg.length < 10) throw new BadRequestException('Message must be at least 10 characters');
    if (msg.length > 500) throw new BadRequestException('Message max 500 characters');

    // Rate limit: 5 reports per 10 minutes
    await this.checkRateLimit(`rate:report:${userId}`, REPORT_LIMIT, 600);

    // Dedup: same user + command within 24h
    const dedupKey = `report:hash:${userId}:${cmd}`;
    const existing = await this.redis.get<string>(dedupKey);
    if (existing) {
      throw new HttpException('Ya reportaste este comando recientemente', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Spam detection: block repeated identical messages
    const msgHash = createHash('sha256').update(`${userId}:${msg}`).digest('hex').slice(0, 16);
    const spamKey = `report:spam:${msgHash}`;
    const spamExists = await this.redis.get<string>(spamKey);
    if (spamExists) {
      throw new HttpException('Mensaje duplicado detectado', HttpStatus.TOO_MANY_REQUESTS);
    }

    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

    // Save to DB
    const report = await this.reportModel.create({
      userId,
      command: cmd,
      message: msg,
      category,
      screenshots,
      createdAt: Date.now(),
      status: 'open',
      ipHash,
      userAgent,
      appVersion,
    });

    // Mark dedup + spam
    await this.redis.set(dedupKey, '1', REPORT_DEDUP_TTL);
    await this.redis.set(spamKey, '1', 3600); // 1h spam window

    // Enqueue report dispatch to worker (GitHub + Sentry + Telegram handled async)
    this.moderation.enqueueReport(report._id.toString()).catch((err) =>
      this.logger.warn(`Report enqueue failed: ${(err as Error).message}`),
    );

    return { ok: true };
  }

  /** Get user's own reports */
  async getUserReports(userId: number, limit = 10, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const safeOffset = Math.max(offset, 0);

    const [items, total] = await Promise.all([
      this.reportModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .select('command message category createdAt status')
        .lean()
        .exec(),
      this.reportModel.countDocuments({ userId }).exec(),
    ]);

    return {
      items: items.map((r) => ({
        id: (r as any)._id.toString(),
        command: r.command,
        message: r.message,
        category: r.category,
        screenshots: r.screenshots || [],
        createdAt: r.createdAt,
        status: r.status,
        githubIssueUrl: r.githubIssueUrl,
      })),
      total,
      hasMore: safeOffset + items.length < total,
    };
  }

  /** Get report stats per command (for analytics) */
  async getReportStats(command: string) {
    const cmd = command.toLowerCase().trim();
    const counts = await this.reportModel.aggregate([
      { $match: { command: cmd } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).exec();

    const stats: Record<string, number> = {};
    for (const c of counts) {
      stats[c._id] = c.count;
    }
    return { command: cmd, total: Object.values(stats).reduce((a, b) => a + b, 0), byCategory: stats };
  }

  /** Check if user has already reported a specific command */
  async hasUserReported(userId: number, command: string): Promise<boolean> {
    const cmd = command.toLowerCase().trim();
    const count = await this.reportModel.countDocuments({ userId, command: cmd }).exec();
    return count > 0;
  }

  // ════════════════════════════════════════════════
  // ADMIN NOTIFICATION
  // ════════════════════════════════════════════════

  private async notifyAdmin(command: string, userId: number, category: string, message: string, screenshots: string[] = []) {
    if (!this.botToken || !this.adminChatId) return;

    const screenshotLines = screenshots.length > 0
      ? `\n📎 *Screenshots:* ${screenshots.length}`
      : '';

    const text = [
      `🚨 *Nuevo reporte de comando*`,
      ``,
      `*Comando:* /${command}`,
      `*Usuario:* ${userId}`,
      `*Tipo:* ${category}`,
      ``,
      `*Mensaje:*`,
      `"${message}"`,
      screenshotLines,
    ].join('\n');

    try {
      await fetch(`${this.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.adminChatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      this.logger.warn(`Failed to notify admin: ${(err as Error).message}`);
    }
  }

  // ════════════════════════════════════════════════
  // RATE LIMIT HELPER
  // ════════════════════════════════════════════════

  private async checkRateLimit(key: string, max: number, windowSec: number) {
    if (!this.redis.available) return; // Skip if Redis is down

    const current = await this.redis.get<number>(key);
    if (current !== null && current >= max) {
      // throw new HttpException('Too many requests, please try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment — use set with existing TTL preservation
    const next = (current ?? 0) + 1;
    await this.redis.set(key, next, current === null ? windowSec : undefined);
  }

  /* ═══════════════════════════════════════════════════
   *  COMMAND PREVIEW — lightweight simulated results
   * ═══════════════════════════════════════════════════ */
  async getCommandPreview(slug: string, input: string): Promise<{ result: string | null; cached: boolean }> {
    const cacheKey = `preview:${slug}:${input.slice(0, 100)}`;

    // Try Redis cache
    const cached = await this.redis.get<string>(cacheKey);
    if (cached) return { result: cached, cached: true };

    // Generate lightweight preview per command type
    const result = this.generatePreview(slug, input);
    if (result) {
      await this.redis.set(cacheKey, result, 60); // 60s cache
    }

    return { result, cached: false };
  }

  private generatePreview(slug: string, input: string): string | null {
    const s = slug.toLowerCase();

    if (s === 'translate' || s === 'tr') {
      // Simple translation hint — actual translation would be heavy
      return `🌐 «${input.slice(0, 80)}» → Translating...`;
    }
    if (s === 'ssweb' || s === 'ss') {
      const isUrl = /^https?:\/\//.test(input) || /\.\w{2,}/.test(input);
      return isUrl
        ? `📸 Screenshot of ${input.slice(0, 60)} — Ready to capture`
        : null;
    }
    if (s === 'play') {
      return `🎵 Searching: "${input.slice(0, 60)}"...`;
    }
    if (s === 'chatgpt' || s === 'gpt' || s === 'ai') {
      return `🤖 Processing: "${input.slice(0, 80)}"`;
    }
    if (s === 'sticker') {
      return `🎨 Creating sticker from: "${input.slice(0, 60)}"`;
    }
    if (s === 'qr') {
      return `📱 QR Code for: "${input.slice(0, 80)}"`;
    }
    if (s === 'tts') {
      return `🔊 Audio: "${input.slice(0, 60)}" — Text to Speech ready`;
    }
    if (s === 'calc' || s === 'math') {
      try {
        // Only allow safe math expressions
        if (/^[0-9+\-*/().%\s]+$/.test(input)) {
          const result = Function('"use strict"; return (' + input + ')')();
          return `🔢 = ${result}`;
        }
      } catch {}
      return `🔢 Calculating: ${input.slice(0, 60)}`;
    }

    return null; // Command doesn't support preview
  }

  /* ═══════════════════════════════════════════════════
   *  COMMUNITY SIGNALS — live engagement data
   * ═══════════════════════════════════════════════════ */
  async getCommandSignals(slug: string): Promise<{
    activeUsersNow: number;
    trendingScore: number;
    regionTrend: boolean;
    discussionsCount: number;
  }> {
    const cacheKey = `signals:${slug}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    // Active users = recent history entries (last 5 min)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const activeUsersNow = await this.historyModel.countDocuments({
      command: { $regex: new RegExp(`^/${slug}(\\s|$)`, 'i') },
      timestamp: { $gte: fiveMinAgo },
    }).exec();

    // Trending score based on recent vs historical usage
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUses = await this.historyModel.countDocuments({
      command: { $regex: new RegExp(`^/${slug}(\\s|$)`, 'i') },
      timestamp: { $gte: oneDayAgo },
    }).exec();
    const weeklyAvg = (await this.historyModel.countDocuments({
      command: { $regex: new RegExp(`^/${slug}(\\s|$)`, 'i') },
      timestamp: { $gte: oneWeekAgo },
    }).exec()) / 7;

    const trendingScore = weeklyAvg > 0
      ? Math.min(+(recentUses / weeklyAvg).toFixed(2), 5)
      : recentUses > 0 ? 1.0 : 0;

    // Discussions = recent reviews
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const discussionsCount = await this.ratingModel.countDocuments({
      command: slug,
      text: { $exists: true, $ne: '' },
      createdAt: { $gte: sevenDaysAgo },
    }).exec();

    const result = {
      activeUsersNow,
      trendingScore,
      regionTrend: trendingScore >= 1.5,
      discussionsCount,
    };

    await this.redis.set(cacheKey, result, 60); // 60s cache
    return result;
  }

  /* ═══════════════════════════════════════════════════
   *  KNOWLEDGE BASE — issues & tips from reports/reviews
   * ═══════════════════════════════════════════════════ */
  async getCommandKnowledge(slug: string): Promise<{
    knownIssues: string[];
    tips: string[];
    lastUpdated: number | null;
  }> {
    const cacheKey = `knowledge:${slug}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    // Known issues from recent bug reports
    const recentReports = await this.reportModel.find({
      command: slug,
      category: { $in: ['bug', 'wrong_result', 'crash'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('message category createdAt')
      .lean()
      .exec();

    // Deduplicate and extract top issues
    const issueMap = new Map<string, number>();
    for (const r of recentReports) {
      if (!r.message) continue;
      const key = r.message.slice(0, 100).toLowerCase().trim();
      issueMap.set(key, (issueMap.get(key) || 0) + 1);
    }
    const knownIssues = [...issueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([desc]) => desc.charAt(0).toUpperCase() + desc.slice(1));

    // Tips from high-rated reviews
    const helpfulReviews = await this.ratingModel.find({
      command: slug,
      rating: { $gte: 4 },
      review: { $exists: true, $ne: '' },
    })
      .sort({ helpful: -1, createdAt: -1 })
      .limit(10)
      .select('review createdAt')
      .lean()
      .exec();

    // Extract short tips from review text
    const tips: string[] = [];
    for (const r of helpfulReviews) {
      if (!r.review || tips.length >= 5) break;
      // Take first sentence as a tip if it's short enough
      const firstSentence = r.review.split(/[.!?\n]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 10 && firstSentence.length < 120) {
        tips.push(firstSentence);
      }
    }

    const lastUpdated = recentReports[0]?.createdAt || helpfulReviews[0]?.createdAt || null;

    const result = { knownIssues, tips, lastUpdated };
    await this.redis.set(cacheKey, result, 300); // 5min cache
    return result;
  }

  // ════════════════════════════════════════════════
  // REPORT TIMELINE & DETAIL
  // ════════════════════════════════════════════════

  async getReportTimeline(userId: number, reportId: string, limit = 50, before?: number) {
    // Verify ownership
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId,
    }).lean().exec();
    if (!report) throw new BadRequestException('Report not found');

    const filter: Record<string, unknown> = { reportId: report._id };
    if (before) filter.createdAt = { $lt: before };

    const events = await this.reportEventModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();

    return {
      items: events.map((e) => ({
        id: (e as any)._id.toString(),
        type: e.type,
        action: e.action,
        actor: e.actor,
        content: e.content,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      hasMore: events.length === limit,
    };
  }

  async getReportDetail(userId: number, reportId: string) {
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId,
    }).lean().exec();
    if (!report) throw new BadRequestException('Report not found');

    const eventsCount = await this.reportEventModel.countDocuments({ reportId: report._id }).exec();
    const lastEvent = await this.reportEventModel
      .findOne({ reportId: report._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      id: (report as any)._id.toString(),
      command: report.command,
      message: report.message,
      category: report.category,
      screenshots: report.screenshots || [],
      createdAt: report.createdAt,
      status: report.status,
      githubIssueUrl: report.githubIssueUrl,
      githubIssueNumber: report.githubIssueNumber,
      githubState: report.githubState || null,
      githubLabels: report.githubLabels || [],
      githubAssignees: report.githubAssignees || [],
      eventsCount,
      lastUpdate: lastEvent?.createdAt || report.createdAt,
    };
  }
}

// ── Types ──────────────────────────────────────────

export interface CommandStatsResult {
  rating: number;
  ratingsCount: number;
  weeklyUses: number;
  favorites: number;
}

export interface RankingEntry {
  command: string;
  weeklyUses: number;
  favorites: number;
  trendingScore: number;
  popularScore: number;
}

export interface CommandRankingsResult {
  generatedAt: number;
  trending: RankingEntry[];
  popular: RankingEntry[];
}

export interface ReviewsSummary {
  avgRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}
