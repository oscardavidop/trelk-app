import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schemas/analytics-event.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

interface TrackPayload {
  userId: number;
  event: string;
  properties?: Record<string, any>;
  sessionId?: string;
  platform?: string;
  source?: string;
}

@Injectable()
export class AnalyticsTrackingService {
  private readonly logger = new Logger(AnalyticsTrackingService.name);
  private buffer: TrackPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectModel(AnalyticsEvent.name) private readonly eventModel: Model<AnalyticsEventDocument>,
    private readonly redis: RedisCacheService,
  ) {
    // Flush buffer every 5 seconds
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  /** Track an event (non-blocking, buffered) */
  track(payload: TrackPayload): void {
    this.buffer.push({ ...payload, properties: payload.properties || {} });

    // Also increment real-time counter in Redis
    const dayKey = `analytics:daily:${payload.event}:${new Date().toISOString().slice(0, 10)}`;
    this.redis.incr(dayKey).then(() => this.redis.expire(dayKey, 172800)); // 48h
  }

  /** Batch track multiple events */
  trackBatch(events: TrackPayload[]): void {
    for (const e of events) {
      this.track(e);
    }
  }

  /** Get event counts for a time range */
  async getCounts(
    event: string,
    from: number,
    to: number = Date.now(),
  ): Promise<number> {
    try {
      return await this.eventModel.countDocuments({
        event,
        timestamp: { $gte: from, $lte: to },
      }).exec();
    } catch {
      return 0;
    }
  }

  /** Get user's event stream (for debugging / admin) */
  async getUserEvents(userId: number, limit = 50): Promise<any[]> {
    return this.eventModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /** Get daily active users count */
  async getDailyActiveUsers(date?: string): Promise<number> {
    const d = date || new Date().toISOString().slice(0, 10);
    const cacheKey = `analytics:dau:${d}`;
    const cached = await this.redis.get<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      const startOfDay = new Date(d).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      const result = await this.eventModel.distinct('userId', {
        timestamp: { $gte: startOfDay, $lt: endOfDay },
      }).exec();
      const count = result.length;
      await this.redis.set(cacheKey, count, 300);
      return count;
    } catch {
      return 0;
    }
  }

  // ── Internal ──

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await this.eventModel.insertMany(
        batch.map(e => ({
          userId: e.userId,
          event: e.event,
          properties: e.properties,
          sessionId: e.sessionId || '',
          platform: e.platform || '',
          source: e.source || '',
          timestamp: Date.now(),
        })),
        { ordered: false },
      );
    } catch (err: any) {
      this.logger.warn(`Analytics flush failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush(); // Flush remaining on shutdown
  }
}
