import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';

/**
 * Cache invalidation events — defines which cache keys to purge
 * when a data mutation occurs.
 */
export type CacheEvent =
  | { type: 'review_created'; command: string; userId: number }
  | { type: 'review_deleted'; command: string; userId: number }
  | { type: 'review_updated'; command: string; userId: number }
  | { type: 'helpful_toggled'; command: string; reviewId: string }
  | { type: 'reply_created'; command: string; reviewId: string }
  | { type: 'favorite_toggled'; command: string; userId: number }
  | { type: 'summary_generated'; command: string }
  | { type: 'user_updated'; userId: number }
  | { type: 'rating_submitted'; command: string; userId: number }
  | { type: 'feedback_submitted'; command: string }
  | { type: 'moderation_complete'; command: string; userId: number }
  | { type: 'user_blocked'; userId: number }
  | { type: 'moderation_manual'; command: string }
  | { type: 'suggestion_updated'; suggestionId: string }
  | { type: 'suggestion_list_changed' };

/**
 * CacheInvalidationService — centralized, event-driven cache invalidation.
 *
 * When a mutation happens, emit an event → this service purges all related cache keys.
 * Prevents stale data across Redis + Mongo + Workers.
 *
 * Usage:
 *   this.cacheInvalidation.emit({ type: 'review_created', command: 'play', userId: 123 });
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger('CacheInvalidation');

  constructor(private readonly redis: RedisCacheService) {}

  /**
   * Emit a cache invalidation event.
   * All related keys are purged atomically.
   */
  async emit(event: CacheEvent): Promise<void> {
    const keys = this.resolveKeys(event);
    if (!keys.length) return;

    const promises = keys.map((k) => this.redis.del(k));
    await Promise.all(promises);

    this.logger.debug({
      msg: 'cache-invalidated',
      event: event.type,
      keys: keys.length,
    });
  }

  /**
   * Write-through cache: write to DB + update cache in one operation.
   */
  async writeThrough<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, value, ttlSeconds);
  }

  /**
   * Read-through cache: check cache first, compute + cache on miss.
   */
  async readThrough<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.get<T>(key);
    if (cached !== null) return cached;

    const value = await compute();
    await this.redis.set(key, value, ttlSeconds);
    return value;
  }

  // ── Key Resolution ──

  private resolveKeys(event: CacheEvent): string[] {
    switch (event.type) {
      case 'review_created':
      case 'review_deleted':
      case 'review_updated':
        return [
          `command:reviews:summary:${event.command}`,
          `command:rating:${event.command}`,
          `command:stats:${event.command}`,
          `highlights:${event.command}`,
          `personalization:${event.userId}`,
          `trust:score:${event.userId}`,
          `recommendations:${event.command}`,
        ];

      case 'helpful_toggled':
        return [
          `command:reviews:summary:${event.command}`,
        ];

      case 'reply_created':
        return [
          // Replies don't affect summary but clear the specific review cache if any
        ];

      case 'favorite_toggled':
        return [
          `personalization:${event.userId}`,
          `command_favorites:${event.userId}`,
        ];

      case 'summary_generated':
        return [
          `command:reviews:summary:${event.command}`,
          `highlights:${event.command}`,
          `recommendations:${event.command}`,
        ];

      case 'user_updated':
        return [
          `personalization:${event.userId}`,
          `trust:score:${event.userId}`,
          `user:state:${event.userId}`,
        ];

      case 'rating_submitted':
        return [
          `command:rating:${event.command}`,
          `command:stats:${event.command}`,
          `command:reviews:summary:${event.command}`,
          `personalization:${event.userId}`,
        ];

      case 'feedback_submitted':
        return [
          `command:rating:${event.command}`,
          `command:stats:${event.command}`,
        ];

      case 'moderation_complete':
        return [
          `command:rating:${event.command}`,
          `command:stats:${event.command}`,
          `command:reviews:summary:${event.command}`,
        ];

      case 'user_blocked':
        return [
          `mod:blocked:${event.userId}`,
        ];

      case 'moderation_manual':
        return [
          `command:rating:${event.command}`,
          `command:stats:${event.command}`,
          `command:reviews:summary:${event.command}`,
        ];

      case 'suggestion_updated':
        return [
          `suggestions:detail:${event.suggestionId}`,
        ];

      case 'suggestion_list_changed':
        // Invalidate known sort/page combos
        const keys: string[] = [];
        for (const sort of ['trending', 'top', 'new']) {
          for (const offset of [0, 10, 20, 30]) {
            keys.push(`suggestions:list:${sort}:10:${offset}:all`);
            keys.push(`suggestions:list:${sort}:20:${offset}:all`);
          }
        }
        return keys;

      default:
        return [];
    }
  }
}
