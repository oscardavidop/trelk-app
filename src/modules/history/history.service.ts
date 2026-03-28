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

    const [commandsToday, commandsTotal, favoritesTotal, achievementsTotal] = await Promise.all([
      this.historyModel.countDocuments({
        userId,
        type: 'command',
        timestamp: { $gte: todayTs },
      }).exec(),
      this.historyModel.countDocuments({
        userId,
        type: 'command',
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
      commandsTotal,
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

  /**
   * Weekly recap: stats for the last 7 days vs the previous 7 days.
   */
  async getWeeklyRecap(userId: number): Promise<WeeklyRecap> {
    const cacheKey = `history:weekly:${userId}`;
    const cached = await this.redis.get<WeeklyRecap>(cacheKey);
    if (cached) return cached;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const [
      commandsThisWeek,
      commandsLastWeek,
      favoritesThisWeek,
      achievementsThisWeek,
      topCommands,
      uniqueCommandsThisWeek,
    ] = await Promise.all([
      this.historyModel.countDocuments({ userId, type: 'command', timestamp: { $gte: weekAgo } }).exec(),
      this.historyModel.countDocuments({ userId, type: 'command', timestamp: { $gte: twoWeeksAgo, $lt: weekAgo } }).exec(),
      this.historyModel.countDocuments({ userId, type: 'favorite_added', timestamp: { $gte: weekAgo } }).exec(),
      this.historyModel.countDocuments({ userId, type: 'achievement', timestamp: { $gte: weekAgo } }).exec(),
      this.historyModel.aggregate([
        { $match: { userId, type: 'command', timestamp: { $gte: weekAgo } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]).exec(),
      this.historyModel.aggregate([
        { $match: { userId, type: 'command', timestamp: { $gte: weekAgo } } },
        { $group: { _id: '$command' } },
        { $count: 'total' },
      ]).exec(),
    ]);

    const commandsTrend = commandsLastWeek > 0
      ? Math.round(((commandsThisWeek - commandsLastWeek) / commandsLastWeek) * 100)
      : commandsThisWeek > 0 ? 100 : 0;

    const recap: WeeklyRecap = {
      commandsThisWeek,
      commandsLastWeek,
      commandsTrend,
      favoritesAdded: favoritesThisWeek,
      achievementsUnlocked: achievementsThisWeek,
      topCommands: topCommands.map((t) => ({ command: t._id, count: t.count })),
      uniqueCommandsUsed: uniqueCommandsThisWeek[0]?.total ?? 0,
      weekStart: weekAgo,
      weekEnd: now,
    };

    await this.redis.set(cacheKey, recap, 300); // 5 min cache
    return recap;
  }
}

export interface ActivityStats {
  commandsToday: number;
  commandsTotal: number;
  favoritesTotal: number;
  achievementsTotal: number;
}

export interface GlobalStats {
  commandsToday: number;
  commandsYesterday: number;
}

export interface WeeklyRecap {
  commandsThisWeek: number;
  commandsLastWeek: number;
  commandsTrend: number;
  favoritesAdded: number;
  achievementsUnlocked: number;
  topCommands: { command: string; count: number }[];
  uniqueCommandsUsed: number;
  weekStart: number;
  weekEnd: number;
}
