import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisCacheService } from '../redis/redis-cache.service';

interface MetricsBucket {
  requests: number;
  errors: number;
  latencySum: number;
  latencyCount: number;
  latencyMax: number;
  cacheHits: number;
  cacheMisses: number;
}

const METRICS_KEY = 'metrics:current';
const METRICS_TTL = 300; // 5min
const METRICS_HISTORY_KEY = 'metrics:history';

/**
 * Lightweight observability service.
 * Tracks: requests/sec, error rate, latency p95, queue size, cache hit rate.
 * Structured JSON logs per service.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private bucket: MetricsBucket = this.emptyBucket();
  private latencies: number[] = [];
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(private readonly redis: RedisCacheService) {}

  async onModuleInit() {
    // Flush metrics to Redis every 10 seconds
    this.intervalRef = setInterval(() => this.flush(), 10_000);
    this.logger.log('Metrics collection started (10s flush interval)');
  }

  /** Record a request */
  recordRequest(latencyMs: number, isError: boolean): void {
    this.bucket.requests++;
    this.bucket.latencySum += latencyMs;
    this.bucket.latencyCount++;
    if (latencyMs > this.bucket.latencyMax) this.bucket.latencyMax = latencyMs;
    this.latencies.push(latencyMs);
    if (isError) this.bucket.errors++;

    // Keep latency array bounded
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-500);
    }
  }

  /** Record a cache access */
  recordCacheAccess(hit: boolean): void {
    if (hit) this.bucket.cacheHits++;
    else this.bucket.cacheMisses++;
  }

  /** Get current snapshot */
  async getSnapshot(): Promise<{
    requestsPerSec: number;
    errorRate: number;
    latencyP50: number;
    latencyP95: number;
    latencyP99: number;
    latencyMax: number;
    cacheHitRate: number;
    uptime: number;
    memory: { rss: string; heapUsed: string };
  }> {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const len = sorted.length;

    const totalCache = this.bucket.cacheHits + this.bucket.cacheMisses;
    const memUsage = process.memoryUsage();

    return {
      requestsPerSec: len > 0 ? Math.round(this.bucket.requests / 10) : 0,
      errorRate: this.bucket.requests > 0 ? this.bucket.errors / this.bucket.requests : 0,
      latencyP50: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
      latencyP95: len > 0 ? sorted[Math.floor(len * 0.95)] : 0,
      latencyP99: len > 0 ? sorted[Math.floor(len * 0.99)] : 0,
      latencyMax: this.bucket.latencyMax,
      cacheHitRate: totalCache > 0 ? this.bucket.cacheHits / totalCache : 0,
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      },
    };
  }

  /** Structured JSON log */
  log(service: string, event: string, data: Record<string, any> = {}): void {
    const entry = {
      ts: new Date().toISOString(),
      service,
      event,
      ...data,
    };
    // Structured log to stdout (picked up by log aggregators)
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  private async flush(): Promise<void> {
    try {
      const snapshot = await this.getSnapshot();
      await this.redis.set(METRICS_KEY, snapshot, METRICS_TTL);

      // Reset bucket
      this.bucket = this.emptyBucket();
      this.latencies = [];
    } catch {
      // Non-critical
    }
  }

  private emptyBucket(): MetricsBucket {
    return {
      requests: 0,
      errors: 0,
      latencySum: 0,
      latencyCount: 0,
      latencyMax: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}
