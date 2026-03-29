import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewSummary, ReviewSummaryDocument } from './schemas/review-summary.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { ReviewModerationService } from '../moderation/review-moderation.service';
import { SUMMARY_TEXT_TTL } from '../../common/constants/command-stats.constants';

@Injectable()
export class ReviewSummaryService {
  private readonly logger = new Logger(ReviewSummaryService.name);

  constructor(
    @InjectModel(ReviewSummary.name) private readonly reviewSummaryModel: Model<ReviewSummaryDocument>,
    private readonly redis: RedisCacheService,
    private readonly moderation: ReviewModerationService,
  ) {}

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
      await this.redis.set(cacheKey, result, SUMMARY_TEXT_TTL);
      return result;
    }

    this.moderation.enqueueAISummary(cmd).catch(() => {});

    return {
      text: '', pros: [], cons: [], sentiment: 'neutral',
      confidenceLevel: 'low', confidenceScore: 0, trend: 'none',
      trendMessage: '', totalReviews: 0, updatedAt: null,
      positiveCount: 0, negativeCount: 0,
    };
  }
}
