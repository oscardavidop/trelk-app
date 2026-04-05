import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History, HistoryDocument } from '../history/schemas/history.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const CACHE_KEY = 'live:global';
const CACHE_TTL = 10; // 10s

export interface LiveMetrics {
  activeUsers: number;
  commandsPerMinute: number;
  trending: { slug: string; growth: number }[];
}

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    @InjectModel(History.name, 'mbot')
    private readonly historyModel: Model<HistoryDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  /**
   * Track a user as active (called from middleware/interceptor).
   * Sets a key with 60s TTL so it self-expires.
   */
  async trackActiveUser(userId: number): Promise<void> {
    await this.redis.set(`active:user:${userId}`, 1, 60);
  }

  /**
   * Record a command execution for per-minute counters.
   * Uses Redis INCR with 120s TTL on minute buckets.
   */
  async trackCommand(slug: string): Promise<void> {
    const minute = Math.floor(Date.now() / 60_000);

    // Global commands-per-minute counter
    const minuteKey = `commands:minute:${minute}`;
    await this.redis.incr(minuteKey);
    await this.redis.expire(minuteKey, 120);

    // Per-command counter for trending
    const cmdKey = `command:usage:${slug}:${minute}`;
    await this.redis.incr(cmdKey);
    await this.redis.expire(cmdKey, 600); // 10 min retention
  }

  /**
   * Get live metrics with aggressive caching.
   * Cached 10s in Redis — computes from counters + Mongo fallback.
   */
  async getMetrics(): Promise<LiveMetrics> {
    // Try cache first
    const cached = await this.redis.get<LiveMetrics>(CACHE_KEY);
    if (cached) return cached;

    const [activeUsers, commandsPerMinute, trending] = await Promise.all([
      this.countActiveUsers(),
      this.countCommandsPerMinute(),
      this.computeTrending(),
    ]);

    const metrics: LiveMetrics = { activeUsers, commandsPerMinute, trending };

    await this.redis.set(CACHE_KEY, metrics, CACHE_TTL);
    // this.logger.log('LIVE_METRICS_CALCULATED');

    return metrics;
  }

  // ── Internal ───────────────────────────────────

  private async countActiveUsers(): Promise<number> {
    const client = this.redis.getClient();
    if (!client) return this.countActiveUsersFallback();

    try {
      let count = 0;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          'active:user:*',
          'COUNT',
          200,
        );
        cursor = nextCursor;
        count += keys.length;
      } while (cursor !== '0');
      return count;
    } catch {
      return this.countActiveUsersFallback();
    }
  }

  /** Fallback: count distinct users in last 60s from Mongo */
  private async countActiveUsersFallback(): Promise<number> {
    try {
      const since = Date.now() - 60_000;
      const result = await this.historyModel
        .distinct('userId', { timestamp: { $gte: since } })
        .exec();
      return result.length;
    } catch {
      return 0;
    }
  }

  private async countCommandsPerMinute(): Promise<number> {
    const minute = Math.floor(Date.now() / 60_000);
    // Current minute might be partial; prefer previous minute
    const prevMinuteKey = `commands:minute:${minute - 1}`;
    const count = await this.redis.get<number>(prevMinuteKey);

    if (count !== null && count > 0) return count;

    // Fallback: count from Mongo
    try {
      const since = Date.now() - 60_000;
      return await this.historyModel
        .countDocuments({ type: 'command', timestamp: { $gte: since } })
        .exec();
    } catch {
      return 0;
    }
  }

  private async computeTrending(): Promise<
    { slug: string; growth: number }[]
  > {
    const now = Math.floor(Date.now() / 60_000);
    const client = this.redis.getClient();

    if (!client) return this.computeTrendingFallback();

    try {
      // Collect usage for recent 5 min and previous 5 min
      const slugs = ['play', 'tts', 'ssweb', 'sticker', 'translate', 'help'];
      const results: { slug: string; growth: number }[] = [];

      for (const slug of slugs) {
        let recent = 0;
        let previous = 0;

        for (let i = 0; i < 5; i++) {
          const recentKey = `command:usage:${slug}:${now - i}`;
          const prevKey = `command:usage:${slug}:${now - 5 - i}`;
          const [r, p] = await Promise.all([
            client.get(recentKey),
            client.get(prevKey),
          ]);
          recent += parseInt(r || '0', 10);
          previous += parseInt(p || '0', 10);
        }

        if (recent > 0) {
          const growth =
            previous > 0
              ? Math.round(((recent - previous) / previous) * 100)
              : 100;
          results.push({ slug, growth });
        }
      }

      // Sort by absolute recent usage, return top 3
      return results
        .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
        .slice(0, 3);
    } catch {
      return this.computeTrendingFallback();
    }
  }

  /** Fallback trending from Mongo (last 30 min) */
  private async computeTrendingFallback(): Promise<
    { slug: string; growth: number }[]
  > {
    try {
      const since = Date.now() - 30 * 60_000;
      const pipeline = [
        { $match: { type: 'command', timestamp: { $gte: since } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 as const } },
        { $limit: 3 },
      ];

      const results = await this.historyModel.aggregate(pipeline).exec();
      return results.map((r) => ({
        slug: (r._id as string).replace('/', ''),
        growth: 0, // Can't compute growth without comparison window
      }));
    } catch {
      return [];
    }
  }
}
