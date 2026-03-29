import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRating, CommandRatingDocument } from '../ratings/schemas/command-rating.schema';
import { CommandReport, CommandReportDocument } from '../reports/schemas/command-report.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteDocument } from '../command-favorites/schemas/command-favorite.schema';
import { ReviewSummary, ReviewSummaryDocument } from '../review-summary/schemas/review-summary.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { RatingsService } from '../ratings/ratings.service';
import { STATS_TTL, WEEKLY_TTL } from '../../common/constants/command-stats.constants';
import { CommandStatsResult, RankingEntry, CommandRankingsResult } from '../../common/types/command-stats.types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(CommandReport.name) private readonly reportModel: Model<CommandReportDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(CommandFavorite.name) private readonly favModel: Model<CommandFavoriteDocument>,
    @InjectModel(ReviewSummary.name) private readonly reviewSummaryModel: Model<ReviewSummaryDocument>,
    private readonly redis: RedisCacheService,
    private readonly ratings: RatingsService,
  ) {}

  async getStats(command: string) {
    const cmd = command.toLowerCase().trim();
    const cacheKey = `command:stats:${cmd}`;

    const cached = await this.redis.get<CommandStatsResult>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [ratingAgg, weeklyUses, favorites] = await Promise.all([
      this.ratings.getRatingStats(cmd),
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
            command: { $type: 'string', $nin: ['', null] },
          },
        },
        {
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

    const trending = [...combined]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, safeTrending);

    const trendingCommands = new Set(trending.map(t => t.command));

    const popular = combined
      .sort((a, b) => b.popularScore - a.popularScore)
      .filter(item => !trendingCommands.has(item.command))
      .slice(0, safePopular);

    const result: CommandRankingsResult = {
      generatedAt: Date.now(),
      trending,
      popular
    };

    await this.redis.set(cacheKey, result, WEEKLY_TTL);
    return result;
  }

  async getCommandPreview(slug: string, input: string): Promise<{ result: string | null; cached: boolean }> {
    const cacheKey = `preview:${slug}:${input.slice(0, 100)}`;

    const cached = await this.redis.get<string>(cacheKey);
    if (cached) return { result: cached, cached: true };

    const result = this.generatePreview(slug, input);
    if (result) {
      await this.redis.set(cacheKey, result, 60);
    }

    return { result, cached: false };
  }

  private generatePreview(slug: string, input: string): string | null {
    const s = slug.toLowerCase();

    if (s === 'translate' || s === 'tr') {
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
        if (/^[0-9+\-*/().%\s]+$/.test(input)) {
          const result = Function('"use strict"; return (' + input + ')')();
          return `🔢 = ${result}`;
        }
      } catch {}
      return `🔢 Calculating: ${input.slice(0, 60)}`;
    }

    return null;
  }

  async getCommandSignals(slug: string): Promise<{
    activeUsersNow: number;
    trendingScore: number;
    regionTrend: boolean;
    trendDelta: number;
    discussionsCount: number;
  }> {
    const cacheKey = `signals:${slug}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const activeUsersNow = await this.historyModel.countDocuments({
      command: { $regex: new RegExp(`^/${slug}(\\s|$)`, 'i') },
      timestamp: { $gte: fiveMinAgo },
    }).exec();

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
      trendDelta: Math.round((trendingScore - 1) * 10),
      discussionsCount,
    };

    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async getCommandKnowledge(slug: string): Promise<{
    knownIssues: string[];
    tips: string[];
    lastUpdated: number | null;
  }> {
    const cacheKey = `knowledge:${slug}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const recentReports = await this.reportModel.find({
      command: slug,
      category: { $in: ['bug', 'wrong_result', 'crash'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('message category createdAt')
      .lean()
      .exec();

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

    const tips: string[] = [];
    for (const r of helpfulReviews) {
      if (!r.review || tips.length >= 5) break;
      const firstSentence = r.review.split(/[.!?\n]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 10 && firstSentence.length < 120) {
        tips.push(firstSentence);
      }
    }

    const lastUpdated = recentReports[0]?.createdAt || helpfulReviews[0]?.createdAt || null;

    const result = { knownIssues, tips, lastUpdated };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }
}
