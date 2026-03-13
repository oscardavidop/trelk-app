import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History, HistoryDocument } from './schemas/history.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const STATS_CACHE_KEY = 'history:stats';
const STATS_CACHE_TTL = 30; // 30s cache for stats

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  /**
   * Paginated history for a user, ordered by timestamp desc.
   * Uses the compound index { userId: 1, timestamp: -1 }.
   */
  async findPaginated(userId: number, offset: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);

    const [items, total] = await Promise.all([
      this.historyModel
        .find({ userId })
        .select(['type', 'command', 'timestamp', 'args', 'achievementName'])
        .sort({ timestamp: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      // Only count on first page to avoid expensive counts on every scroll
      safeOffset === 0
        ? this.historyModel.countDocuments({ userId }).exec()
        : Promise.resolve(-1),
    ]);

    const nextOffset = safeOffset + items.length;
    const hasMore = items.length === safeLimit;

    return {
      items,
      hasMore,
      nextOffset,
      ...(total >= 0 ? { total } : {}),
    };
  }

  /**
   * Activity summary stats for a user.
   * Uses Redis cache (30s TTL) to avoid hitting Mongo on every page load.
   */
  async getStats(userId: number) {
    const cacheKey = `${STATS_CACHE_KEY}:${userId}`;

    // Try Redis cache first
    const cached = await this.redis.get<ActivityStats>(cacheKey);
    if (cached) return cached;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    const [commandsToday, favoritesTotal, achievementsTotal] = await Promise.all([
      this.historyModel.countDocuments({
        userId,
        type: 'command',
        timestamp: { $gte: todayTs },
      }).exec(),
      this.historyModel.countDocuments({
        userId,
        type: 'favorite_added',
      }).exec(),
      this.historyModel.countDocuments({
        userId,
        type: 'achievement',
      }).exec(),
    ]);

    const stats: ActivityStats = {
      commandsToday,
      favoritesTotal,
      achievementsTotal,
    };

    // Cache for 30s
    await this.redis.set(cacheKey, stats, STATS_CACHE_TTL);

    return stats;
  }

  /**
   * Global stats (all users combined).
   * Cached aggressively since it's expensive.
   */
  async getGlobalStats() {
    const cacheKey = 'history:global-stats';

    const cached = await this.redis.get<GlobalStats>(cacheKey);
    if (cached) return cached;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayTs = yesterdayStart.getTime();

    const [commandsToday, commandsYesterday] = await Promise.all([
      this.historyModel.countDocuments({
        type: 'command',
        timestamp: { $gte: todayTs },
      }).exec(),
      this.historyModel.countDocuments({
        type: 'command',
        timestamp: { $gte: yesterdayTs, $lt: todayTs },
      }).exec(),
    ]);

    const stats: GlobalStats = { commandsToday, commandsYesterday };

    // Cache 60s for global stats
    await this.redis.set(cacheKey, stats, 60);

    return stats;
  }
}

export interface ActivityStats {
  commandsToday: number;
  favoritesTotal: number;
  achievementsTotal: number;
}

export interface GlobalStats {
  commandsToday: number;
  commandsYesterday: number;
}
