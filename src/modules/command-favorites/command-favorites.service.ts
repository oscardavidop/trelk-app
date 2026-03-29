import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandFavorite, CommandFavoriteDocument } from './schemas/command-favorite.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const CACHE_PREFIX = 'cmd-fav';
const LIST_TTL = 60;      // 60s cache for user favorites list
const TRENDING_TTL = 300;  // 5min cache for trending

@Injectable()
export class CommandFavoritesService {
  private readonly logger = new Logger(CommandFavoritesService.name);

  constructor(
    @InjectModel(CommandFavorite.name, 'miniapp') private readonly favModel: Model<CommandFavoriteDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    private readonly redis: RedisCacheService,
  ) { }

  // ════════════════════════════════════════════════
  // FAVORITES CRUD
  // ════════════════════════════════════════════════

  /** Get paginated favorites for a user */
  async getFavorites(userId: number, offset: number, limit: number, search?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const filter: any = { userId };
    if (search) {
      filter.command = { $regex: search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.favModel
        .find(filter)
        .sort({ pinned: -1, createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      safeOffset === 0
        ? this.favModel.countDocuments({ userId }).exec()
        : Promise.resolve(-1),
    ]);

    return {
      items: items.map((f) => ({
        command: f.command,
        pinned: f.pinned,
        createdAt: f.createdAt,
      })),
      hasMore: items.length === safeLimit,
      nextOffset: safeOffset + items.length,
      ...(total >= 0 ? { total } : {}),
    };
  }

  /** Toggle favorite — returns { added: boolean } */
  async toggle(userId: number, command: string): Promise<{ added: boolean }> {
    const trimmed = command.trim().toLowerCase();
    if (!trimmed || trimmed.length > 50) {
      throw new Error('Invalid command name');
    }

    const existing = await this.favModel.findOne({ userId, command: trimmed }).lean().exec();

    if (existing) {
      await this.favModel.deleteOne({ _id: existing._id });
      await this.invalidateCache(userId);
      return { added: false };
    }

    await this.favModel.create({
      userId,
      command: trimmed,
      pinned: false,
      createdAt: Date.now(),
    });
    await this.invalidateCache(userId);
    return { added: true };
  }

  /** Remove a specific favorite */
  async remove(userId: number, command: string): Promise<void> {
    await this.favModel.deleteOne({ userId, command: command.trim().toLowerCase() });
    await this.invalidateCache(userId);
  }

  /** Toggle pin status */
  async togglePin(userId: number, command: string): Promise<{ pinned: boolean }> {
    const fav = await this.favModel.findOne({ userId, command: command.trim().toLowerCase() }).exec();
    if (!fav) throw new Error('Favorite not found');
    fav.pinned = !fav.pinned;
    await fav.save();
    await this.invalidateCache(userId);
    return { pinned: fav.pinned };
  }

  /** Check if a command is favorited */
  async isFavorite(userId: number, command: string): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIX}:set:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);

    if (cached) {
      return cached.includes(command.trim().toLowerCase());
    }

    // Load all favorites into cache
    const all = await this.favModel.find({ userId }).select('command').lean().exec();
    const commands = all.map((f) => f.command);
    await this.redis.set(cacheKey, commands, LIST_TTL);

    return commands.includes(command.trim().toLowerCase());
  }

  /** Get all favorite command names for a user (for bulk check) */
  async getFavoriteSet(userId: number): Promise<string[]> {
    const cacheKey = `${CACHE_PREFIX}:set:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const all = await this.favModel.find({ userId }).select('command').lean().exec();
    const commands = all.map((f) => f.command);
    await this.redis.set(cacheKey, commands, LIST_TTL);
    return commands;
  }

  // ════════════════════════════════════════════════
  // TRENDING — aggregated from history
  // ════════════════════════════════════════════════

  /** Top commands by favorite_added count in last 7 days */
  async getTrending(limit = 10): Promise<{ command: string; count: number }[]> {
    const cacheKey = `${CACHE_PREFIX}:trending`;
    const cached = await this.redis.get<{ command: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const results = await this.historyModel.aggregate([
      { $match: { type: 'favorite_added', timestamp: { $gte: weekAgo } } },
      { $group: { _id: '$item', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Math.min(limit, 30) },
      { $project: { _id: 0, command: '$_id', count: 1 } },
    ]).exec();

    await this.redis.set(cacheKey, results, TRENDING_TTL);
    return results;
  }

  /** Most favorited commands overall (global ranking) */
  async getMostFavorited(limit = 10): Promise<{ command: string; count: number }[]> {
    const cacheKey = `${CACHE_PREFIX}:most-fav:${limit}`;
    const cached = await this.redis.get<{ command: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const results = await this.favModel.aggregate([
      { $group: { _id: '$command', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Math.min(limit, 50) },
      { $project: { _id: 0, command: '$_id', count: 1 } },
    ]).exec();

    await this.redis.set(cacheKey, results, TRENDING_TTL);
    return results;
  }

  // ════════════════════════════════════════════════
  // CACHE HELPERS
  // ════════════════════════════════════════════════

  private async invalidateCache(userId: number) {
    try {
      await this.redis.del(`${CACHE_PREFIX}:set:${userId}`);
    } catch {
      // Graceful — cache miss is not critical
    }
  }
}
