import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandFavorite, CommandFavoriteDocument } from './schemas/command-favorite.schema';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { RedisCacheService } from '../redis/redis-cache.service';
import { CacheInvalidationService } from '../../core/resilience/cache-invalidation.service';
import { PendingDeleteService } from '../pending-delete/pending-delete.service';
import { AppError, ErrorCode } from '../../common/errors';

const CACHE_PREFIX = 'cmd-fav';
const LIST_TTL = 60;      // 60s cache for user favorites list
const TRENDING_TTL = 300;  // 5min cache for trending

@Injectable()
export class CommandFavoritesService {
  private readonly logger = new Logger(CommandFavoritesService.name);

  constructor(
    @InjectModel(CommandFavorite.name) private readonly favModel: Model<CommandFavoriteDocument>,
    @InjectModel(History.name) private readonly historyModel: Model<HistoryDocument>,
    private readonly redis: RedisCacheService,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly pendingDelete: PendingDeleteService,
  ) { }

  // ════════════════════════════════════════════════
  // FAVORITES CRUD
  // ════════════════════════════════════════════════

  /** Get paginated favorites for a user */
  async getFavorites(userId: number, offset: number, limit: number, search?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const filter: any = { userId, status: { $ne: 'pending_delete' } };
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
        ? this.favModel.countDocuments(filter).exec()
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
      throw new AppError(ErrorCode.COMMAND_INVALID, 'Invalid command name', 400);
    }

    const existing = await this.favModel.findOne({
      userId, command: trimmed, status: { $ne: 'pending_delete' },
    }).lean().exec();

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
      status: 'active',
    });
    await this.invalidateCache(userId);
    return { added: true };
  }

  /** Remove a specific favorite (with pending_delete + undo window, or hard delete in persistent mode) */
  async remove(userId: number, command: string): Promise<{ status: string; expiresAt: number; jobId: string }> {
    const trimmed = command.trim().toLowerCase();
    const fav = await this.favModel.findOne({
      userId, command: trimmed, status: { $ne: 'pending_delete' },
    }).exec();

    if (!fav) throw new AppError(ErrorCode.FAVORITE_NOT_FOUND, 'Favorite not found', 404);

    if (this.pendingDelete.isAwareMode) {
      const result = await this.pendingDelete.schedule(
        'command_favorite', this.favModel, [fav._id.toString()], userId,
      );
      await this.invalidateCache(userId);
      return { status: 'pending_delete', expiresAt: result.expiresAt, jobId: result.jobId };
    }

    // Persistent mode — hard delete immediately
    await this.pendingDelete.hardDelete(this.favModel, [fav._id.toString()], userId);
    await this.invalidateCache(userId);
    return { status: 'deleted', expiresAt: 0, jobId: '' };
  }

  /** Undo pending_delete for command-favorites */
  async undoDelete(userId: number, commands?: string[], jobId?: string): Promise<{ restored: number }> {
    let result: { restored: number };

    if (jobId) {
      result = await this.pendingDelete.cancelByJobId(this.favModel, jobId, userId);
    } else if (commands?.length) {
      const docs = await this.favModel.find({
        userId, command: { $in: commands.map((c) => c.trim().toLowerCase()) }, status: 'pending_delete',
      }).select('_id').lean().exec();
      const ids = docs.map((d) => (d as any)._id.toString());
      result = await this.pendingDelete.cancel(this.favModel, ids, userId);
    } else {
      throw new AppError(ErrorCode.COMMAND_INVALID, 'commands or jobId required', 400);
    }

    await this.invalidateCache(userId);
    return result;
  }

  /** Toggle pin status */
  async togglePin(userId: number, command: string): Promise<{ pinned: boolean }> {
    const fav = await this.favModel.findOne({
      userId, command: command.trim().toLowerCase(), status: { $ne: 'pending_delete' },
    }).exec();
    if (!fav) throw new AppError(ErrorCode.FAVORITE_NOT_FOUND, 'Favorite not found', 404);
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

    const all = await this.favModel.find({
      userId, status: { $ne: 'pending_delete' },
    }).select('command').lean().exec();
    const commands = all.map((f) => f.command);
    await this.redis.set(cacheKey, commands, LIST_TTL);

    return commands.includes(command.trim().toLowerCase());
  }

  /** Get all favorite command names for a user (for bulk check) */
  async getFavoriteSet(userId: number): Promise<string[]> {
    const cacheKey = `${CACHE_PREFIX}:set:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const all = await this.favModel.find({
      userId, status: { $ne: 'pending_delete' },
    }).select('command').lean().exec();
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
      await this.cacheInvalidation.emit({ type: 'favorite_toggled', command: '', userId });
    } catch {
      // Graceful — cache miss is not critical
    }
  }
}
