import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { CommandRating, CommandRatingDocument } from '../command-stats/schemas/command-rating.schema';
import { CommandFavorite, CommandFavoriteDocument } from '../command-favorites/schemas/command-favorite.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { BOT_COMMANDS } from '../../data/commands';

interface ScoredCommand {
  command: string;
  score: number;
  reason: 'category' | 'co_usage' | 'popular' | 'trending';
}

export interface RecommendationItem {
  command: string;
  score: number;
  reason: string;
  category?: string;
  rating?: number;
  ratingsCount?: number;
  weeklyUses?: number;
}

const CACHE_PREFIX = 'rec:user:';
const CACHE_TTL = 300; // 5 min

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  // Pre-built lookup maps
  private readonly commandMeta = new Map<string, { category: string; group: string }>();
  private readonly categoryCommands = new Map<string, string[]>();

  constructor(
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    @InjectModel(CommandRating.name) private readonly ratingModel: Model<CommandRatingDocument>,
    @InjectModel(CommandFavorite.name) private readonly favoriteModel: Model<CommandFavoriteDocument>,
    private readonly redis: RedisCacheService,
  ) {
    // Build lookup tables from BOT_COMMANDS
    for (const cmd of BOT_COMMANDS) {
      const slug = cmd.uniqueName;
      const cat = cmd.category || cmd.group || 'general';
      this.commandMeta.set(slug, { category: cat, group: cmd.group });
      const list = this.categoryCommands.get(cat) || [];
      list.push(slug);
      this.categoryCommands.set(cat, list);
    }
  }

  async getRecommendations(userId: number, limit = 10): Promise<RecommendationItem[]> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    const cached = await this.redis.get<RecommendationItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const recommendations = await this.computeRecommendations(userId, limit);
      await this.redis.set(cacheKey, recommendations, CACHE_TTL);
      return recommendations;
    } catch (err) {
      this.logger.error(`Failed to compute recommendations for ${userId}: ${err}`);
      return this.getFallbackPopular(limit);
    }
  }

  private async computeRecommendations(userId: number, limit: number): Promise<RecommendationItem[]> {
    // 1. Get user's command history (last 90 days)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const [userHistory, userFavorites] = await Promise.all([
      this.historyModel
        .find({ userId, type: 'command', timestamp: { $gte: ninetyDaysAgo } })
        .select('command')
        .lean()
        .exec(),
      this.favoriteModel
        .find({ userId })
        .select('command')
        .lean()
        .exec(),
    ]);

    const usedCommands = new Set<string>();
    const commandFrequency = new Map<string, number>();
    for (const h of userHistory) {
      if (h.command) {
        usedCommands.add(h.command);
        commandFrequency.set(h.command, (commandFrequency.get(h.command) || 0) + 1);
      }
    }
    for (const f of userFavorites) {
      usedCommands.add(f.command);
    }

    // If new user with no history, return popular commands
    if (usedCommands.size === 0) {
      return this.getFallbackPopular(limit);
    }

    // 2. Get user's top categories
    const categoryWeight = new Map<string, number>();
    for (const [cmd, freq] of commandFrequency) {
      const meta = this.commandMeta.get(cmd);
      if (meta) {
        categoryWeight.set(meta.category, (categoryWeight.get(meta.category) || 0) + freq);
      }
    }

    // 3. Get global stats: popular commands + co-usage patterns
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [globalPopularity, coUsageData, ratingData] = await Promise.all([
      // Commands used most in last 30 days globally
      this.historyModel.aggregate([
        { $match: { type: 'command', timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ]).exec(),
      // Co-usage: users who used the same commands also used...
      this.getCoUsageCommands(Array.from(usedCommands).slice(0, 10), userId),
      // Average ratings for all commands
      this.ratingModel.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$command', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]).exec(),
    ]);

    // Build lookup maps
    const popularityMap = new Map<string, number>();
    const maxPop = globalPopularity[0]?.count || 1;
    for (const g of globalPopularity) {
      popularityMap.set(g._id, g.count / maxPop); // Normalize 0-1
    }

    const ratingMap = new Map<string, { avg: number; count: number }>();
    for (const r of ratingData) {
      ratingMap.set(r._id, { avg: r.avgRating, count: r.count });
    }

    // 4. Score every candidate command
    const scores = new Map<string, ScoredCommand>();
    const allCommands = BOT_COMMANDS.map((c) => c.uniqueName);

    for (const cmd of allCommands) {
      if (usedCommands.has(cmd)) continue; // Skip already used

      const meta = this.commandMeta.get(cmd);
      if (!meta) continue;

      // Category similarity (0.4 weight)
      const catScore = categoryWeight.get(meta.category) || 0;
      const maxCatWeight = Math.max(...categoryWeight.values(), 1);
      const categorySimilarity = catScore / maxCatWeight;

      // Co-usage (0.3 weight)
      const coUsage = coUsageData.get(cmd) || 0;
      const maxCoUsage = Math.max(...coUsageData.values(), 1);
      const coUsageScore = coUsage / maxCoUsage;

      // Global popularity (0.2 weight)
      const popularity = popularityMap.get(cmd) || 0;

      // Recency boost (0.1 weight) — higher for recently added commands
      const cmdIndex = allCommands.indexOf(cmd);
      const recencyBoost = Math.max(0, 1 - cmdIndex / allCommands.length);

      const totalScore =
        categorySimilarity * 0.4 +
        coUsageScore * 0.3 +
        popularity * 0.2 +
        recencyBoost * 0.1;

      // Determine primary reason
      const reasons: [number, ScoredCommand['reason']][] = [
        [categorySimilarity, 'category'],
        [coUsageScore, 'co_usage'],
        [popularity, 'popular'],
        [recencyBoost, 'trending'],
      ];
      const topReason = reasons.sort((a, b) => b[0] - a[0])[0][1];

      scores.set(cmd, { command: cmd, score: totalScore, reason: topReason });
    }

    // 5. Sort and take top N
    const sorted = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 6. Enrich with metadata
    return sorted.map((s) => {
      const meta = this.commandMeta.get(s.command);
      const rating = ratingMap.get(s.command);
      return {
        command: s.command,
        score: Math.round(s.score * 100) / 100,
        reason: s.reason,
        category: meta?.category,
        rating: rating ? Math.round(rating.avg * 10) / 10 : undefined,
        ratingsCount: rating?.count,
        weeklyUses: popularityMap.has(s.command)
          ? Math.round((popularityMap.get(s.command)! * (globalPopularity[0]?.count || 0)))
          : undefined,
      };
    });
  }

  /**
   * Find commands commonly used by users who also used the given commands.
   */
  private async getCoUsageCommands(
    userCommands: string[],
    excludeUserId: number,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (userCommands.length === 0) return result;

    const coUsers = await this.historyModel.aggregate([
      { $match: { type: 'command', command: { $in: userCommands }, userId: { $ne: excludeUserId } } },
      { $group: { _id: '$userId' } },
      { $limit: 200 },
    ]).exec();

    if (coUsers.length === 0) return result;

    const coUserIds = coUsers.map((u) => u._id);
    const coCommands = await this.historyModel.aggregate([
      { $match: { type: 'command', userId: { $in: coUserIds }, command: { $nin: userCommands } } },
      { $group: { _id: '$command', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]).exec();

    for (const c of coCommands) {
      result.set(c._id, c.count);
    }
    return result;
  }

  /**
   * Fallback: return globally popular commands.
   */
  private async getFallbackPopular(limit: number): Promise<RecommendationItem[]> {
    const cacheKey = 'rec:global:popular';
    const cached = await this.redis.get<RecommendationItem[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const popular = await this.historyModel.aggregate([
      { $match: { type: 'command', timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$command', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).exec();

    const items: RecommendationItem[] = popular.map((p) => ({
      command: p._id,
      score: 1,
      reason: 'popular',
      category: this.commandMeta.get(p._id)?.category,
      weeklyUses: p.count,
    }));

    await this.redis.set(cacheKey, items, 600);
    return items;
  }
}
