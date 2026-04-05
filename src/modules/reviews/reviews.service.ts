import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { ReviewHelpful, ReviewHelpfulDocument } from '../review-helpful/schemas/review-helpful.schema';
import { ReviewReply, ReviewReplyDocument } from '../review-replies/schemas/review-reply.schema';
import { ReviewSummary, ReviewSummaryDocument } from '../review-summary/schemas/review-summary.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { ReviewModerationService } from '../moderation/review-moderation.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { CacheInvalidationService } from '../../core/resilience';
import { REVIEW_SUMMARY_TTL } from '../../common/constants/command-stats.constants';
import { ReviewsSummary } from '../../common/types/command-stats.types';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(ReviewHelpful.name) private readonly helpfulModel: Model<ReviewHelpfulDocument>,
    @InjectModel(ReviewReply.name) private readonly replyModel: Model<ReviewReplyDocument>,
    @InjectModel(ReviewSummary.name) private readonly reviewSummaryModel: Model<ReviewSummaryDocument>,
    private readonly redis: RedisCacheService,
    private readonly moderation: ReviewModerationService,
    private readonly userStats: UserStatsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

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

  async getReviewHighlights(command: string): Promise<string[]> {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `highlights:${cmd}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const doc = await this.reviewSummaryModel
      .findOne({ commandSlug: cmd })
      .select('highlights')
      .lean()
      .exec();

    const highlights: string[] = (doc as any)?.highlights || [];
    await this.redis.set(cacheKey, highlights, 600);
    return highlights;
  }

  async getReviews(command: string, limit = 10, offset = 0, sort: 'recent' | 'relevant' = 'recent', ratingFilter?: number, type?: 'positive' | 'negative', currentUserId?: number) {
    const cmd = command.toLowerCase().trim();
    const safeLimit = Math.min(Math.max(limit, 1), 30);

    const filter: any = {
      command: cmd,
      rating: { $exists: true, $gte: 1 }
    };

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
      ? { impactScore: -1 as const, helpfulCount: -1 as const, updatedAt: -1 as const }
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

  async deleteReview(userId: number, command: string): Promise<void> {
    const cmd = command.toLowerCase().trim();
    const doc = await this.ratingModel.findOne({ userId, command: cmd }).lean().exec();
    if (!doc) throw new BadRequestException('No review found');

    if ((doc as any).status === 'pending') {
      await this.moderation.cancelJob((doc as any)._id.toString()).catch(() => { });
    }

    await this.ratingModel.deleteOne({ userId, command: cmd }).exec();

    const reviewId = (doc as any)._id;
    await this.helpfulModel.deleteMany({ reviewId }).exec();
    await this.replyModel.deleteMany({ reviewId }).exec();

    await this.cacheInvalidation.emit({ type: 'review_deleted', command: cmd, userId });
  }

  async adminDeleteReview(adminUserId: number, reviewId: string): Promise<void> {
    if (!this.userStats.adminIds.has(adminUserId)) {
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
      await this.cacheInvalidation.emit({ type: 'review_deleted', command: cmd, userId: doc.userId });
    }
  }
}
