import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandExecution, CommandExecutionDocument } from './schemas/command-execution.schema';
import { RedisCacheService } from '../redis/redis-cache.service';

const CACHE_PREFIX = 'cmd-rel';
const SCORE_TTL = 60;     // 60s cache for reliability scores
const TIMELINE_TTL = 30;  // 30s cache for timeline data
const ALERTS_TTL = 120;   // 2min cache for alerts

// ╔══════════════════════════════════════════════════╗
// ║  MOCK MODE — set to true to return mock data    ║
// ║  Comment out or set false for real data          ║
// ╚══════════════════════════════════════════════════╝
const USE_MOCK = true;

export interface ReliabilityScore {
  command: string;
  reliability: number;       // 0-100 percentage
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  period: '1h' | '24h' | '7d';
}

export interface TimelinePoint {
  timestamp: number;
  success: number;
  failure: number;
  avgResponseTimeMs: number;
}

export interface ReliabilityAlert {
  command: string;
  reliability: number;
  failureCount: number;
  avgResponseTimeMs: number;
  severity: 'warning' | 'critical';
}

@Injectable()
export class CommandReliabilityService {
  private readonly logger = new Logger(CommandReliabilityService.name);

  constructor(
    @InjectModel(CommandExecution.name) private readonly execModel: Model<CommandExecutionDocument>,
    private readonly redis: RedisCacheService,
  ) {}

  // ════════════════════════════════════════════════
  // TRACKING
  // ════════════════════════════════════════════════

  async track(
    command: string,
    userId: number,
    success: boolean,
    responseTimeMs: number,
    errorType?: string,
  ): Promise<void> {
    await this.execModel.create({
      command: command.toLowerCase().trim(),
      userId,
      timestamp: Date.now(),
      success,
      responseTimeMs: Math.max(0, responseTimeMs),
      errorType: errorType || null,
    });
    // Invalidate caches for this command
    await this.redis.del(`${CACHE_PREFIX}:score:${command}:24h`);
    await this.redis.del(`${CACHE_PREFIX}:timeline:${command}`);
  }

  async trackBatch(events: Array<{
    command: string;
    userId: number;
    success: boolean;
    responseTimeMs: number;
    errorType?: string;
    timestamp?: number;
  }>): Promise<{ tracked: number }> {
    if (!events.length) return { tracked: 0 };
    const docs = events.map((e) => ({
      command: e.command.toLowerCase().trim(),
      userId: e.userId,
      timestamp: e.timestamp || Date.now(),
      success: e.success,
      responseTimeMs: Math.max(0, e.responseTimeMs),
      errorType: e.errorType || null,
    }));
    const result = await this.execModel.insertMany(docs, { ordered: false });
    return { tracked: result.length };
  }

  // ════════════════════════════════════════════════
  // RELIABILITY SCORE
  // ════════════════════════════════════════════════

  async getScore(command: string, period: '1h' | '24h' | '7d' = '24h'): Promise<ReliabilityScore> {
    // ── MOCK ─────────────────────────────────────
    if (USE_MOCK) return this.mockScore(command, period);
    // ─────────────────────────────────────────────

    const cacheKey = `${CACHE_PREFIX}:score:${command}:${period}`;
    const cached = await this.redis.get<ReliabilityScore>(cacheKey);
    if (cached) return cached;

    const since = this.periodToMs(period);
    const cmd = command.toLowerCase().trim();

    const [stats] = await this.execModel.aggregate([
      { $match: { command: cmd, timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successes: { $sum: { $cond: ['$success', 1, 0] } },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          avgResponse: { $avg: '$responseTimeMs' },
          responseTimes: { $push: '$responseTimeMs' },
        },
      },
    ]);

    if (!stats || stats.total === 0) {
      const empty: ReliabilityScore = {
        command: cmd,
        reliability: 100,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        period,
      };
      await this.redis.set(cacheKey, empty, SCORE_TTL);
      return empty;
    }

    // Calculate p95
    const sorted = (stats.responseTimes as number[]).sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[Math.min(p95Idx, sorted.length - 1)];

    const score: ReliabilityScore = {
      command: cmd,
      reliability: Math.round((stats.successes / stats.total) * 10000) / 100,
      totalExecutions: stats.total,
      successCount: stats.successes,
      failureCount: stats.failures,
      avgResponseTimeMs: Math.round(stats.avgResponse),
      p95ResponseTimeMs: Math.round(p95),
      period,
    };

    await this.redis.set(cacheKey, score, SCORE_TTL);
    return score;
  }

  // ════════════════════════════════════════════════
  // TIMELINE (for graphs)
  // ════════════════════════════════════════════════

  async getTimeline(command: string, hours = 24, buckets = 24): Promise<TimelinePoint[]> {
    // ── MOCK ─────────────────────────────────────
    if (USE_MOCK) return this.mockTimeline(buckets);
    // ─────────────────────────────────────────────

    const cacheKey = `${CACHE_PREFIX}:timeline:${command}:${hours}`;
    const cached = await this.redis.get<TimelinePoint[]>(cacheKey);
    if (cached) return cached;

    const cmd = command.toLowerCase().trim();
    const since = Date.now() - hours * 3600_000;
    const bucketMs = (hours * 3600_000) / buckets;

    const pipeline = await this.execModel.aggregate([
      { $match: { command: cmd, timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            $subtract: [
              '$timestamp',
              { $mod: ['$timestamp', bucketMs] },
            ],
          },
          success: { $sum: { $cond: ['$success', 1, 0] } },
          failure: { $sum: { $cond: ['$success', 0, 1] } },
          avgResponseTimeMs: { $avg: '$responseTimeMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill empty buckets
    const result: TimelinePoint[] = [];
    const dataMap = new Map(pipeline.map((p) => [p._id, p]));

    for (let i = 0; i < buckets; i++) {
      const ts = since + i * bucketMs;
      const bucketTs = ts - (ts % bucketMs);
      const d = dataMap.get(bucketTs);
      result.push({
        timestamp: bucketTs,
        success: d?.success ?? 0,
        failure: d?.failure ?? 0,
        avgResponseTimeMs: d ? Math.round(d.avgResponseTimeMs) : 0,
      });
    }

    await this.redis.set(cacheKey, result, TIMELINE_TTL);
    return result;
  }

  // ════════════════════════════════════════════════
  // ALERTS — commands with low reliability
  // ════════════════════════════════════════════════

  async getAlerts(threshold = 95): Promise<ReliabilityAlert[]> {
    const cacheKey = `${CACHE_PREFIX}:alerts:${threshold}`;
    const cached = await this.redis.get<ReliabilityAlert[]>(cacheKey);
    if (cached) return cached;

    const since = Date.now() - 24 * 3600_000;

    const stats = await this.execModel.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$command',
          total: { $sum: 1 },
          successes: { $sum: { $cond: ['$success', 1, 0] } },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          avgResponse: { $avg: '$responseTimeMs' },
        },
      },
      { $match: { total: { $gte: 5 } } }, // Minimum 5 executions to flag
      { $sort: { failures: -1 } },
    ]);

    const alerts: ReliabilityAlert[] = stats
      .map((s) => ({
        command: s._id,
        reliability: Math.round((s.successes / s.total) * 10000) / 100,
        failureCount: s.failures,
        avgResponseTimeMs: Math.round(s.avgResponse),
        severity: (s.successes / s.total < 0.8 ? 'critical' : 'warning') as 'critical' | 'warning',
      }))
      .filter((a) => a.reliability < threshold);

    await this.redis.set(cacheKey, alerts, ALERTS_TTL);
    return alerts;
  }

  // ════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════

  private periodToMs(period: '1h' | '24h' | '7d'): number {
    const now = Date.now();
    switch (period) {
      case '1h': return now - 3600_000;
      case '24h': return now - 24 * 3600_000;
      case '7d': return now - 7 * 24 * 3600_000;
    }
  }

  // ════════════════════════════════════════════════
  // MOCK HELPERS — Remove when real data is flowing
  // ════════════════════════════════════════════════

  private mockScore(command: string, period: '1h' | '24h' | '7d'): ReliabilityScore {
    const bases: Record<string, number> = { alert: 99.2, md5: 96.8, qr: 94.1, dog: 97.5, cat: 98.3 };
    const rel = bases[command.toLowerCase()] ?? 95 + Math.random() * 4;
    const total = period === '1h' ? 42 : period === '24h' ? 387 : 2450;
    const failures = Math.round(total * (1 - rel / 100));
    return {
      command: command.toLowerCase(),
      reliability: +rel.toFixed(1),
      totalExecutions: total,
      successCount: total - failures,
      failureCount: failures,
      avgResponseTimeMs: 120 + Math.round(Math.random() * 180),
      p95ResponseTimeMs: 280 + Math.round(Math.random() * 220),
      period,
    };
  }

  private mockTimeline(buckets: number): TimelinePoint[] {
    const now = Date.now();
    const bucketMs = (24 * 3600_000) / buckets;
    return Array.from({ length: buckets }, (_, i) => {
      const base = 8 + Math.round(Math.random() * 15);
      return {
        timestamp: now - (buckets - i) * bucketMs,
        success: base,
        failure: Math.random() > 0.7 ? Math.round(Math.random() * 3) : 0,
        avgResponseTimeMs: 100 + Math.round(Math.random() * 200),
      };
    });
  }
}
