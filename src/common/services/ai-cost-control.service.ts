import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';
import { FeatureFlagsService } from './feature-flags.service';

const AI_COOLDOWN_KEY = 'ai:cooldown:';
const AI_RESULT_CACHE_KEY = 'ai:result:';
const AI_REVIEW_COUNT_KEY = 'ai:reviews:';

/**
 * Controls AI invocation costs.
 * Rules:
 * - Only generate summary after N new reviews (default: 10)
 * - Or after M minutes since last generation (default: 5min)
 * - Cache results aggressively
 * - Skip if no changes since last run
 */
@Injectable()
export class AICostControlService {
  private readonly logger = new Logger(AICostControlService.name);
  private readonly minReviews: number;
  private readonly intervalMs: number;

  constructor(
    private readonly redis: RedisCacheService,
    private readonly config: ConfigService,
    private readonly flags: FeatureFlagsService,
  ) {
    this.minReviews = this.config.get<number>('AI_SUMMARY_MIN_REVIEWS', 10);
    this.intervalMs = this.config.get<number>('AI_SUMMARY_INTERVAL_MS', 300_000); // 5min
  }

  /**
   * Check if AI summary should be regenerated for a command.
   * Returns true only if:
   * 1) Feature flag is enabled
   * 2) At least N new reviews since last generation
   * 3) OR at least M minutes have passed
   */
  async shouldGenerateSummary(commandSlug: string): Promise<boolean> {
    if (!this.flags.isEnabled('ai_summary')) return false;

    // Check cooldown
    const cooldownKey = `${AI_COOLDOWN_KEY}${commandSlug}`;
    const lastRun = await this.redis.get<number>(cooldownKey);

    if (lastRun) {
      const elapsed = Date.now() - lastRun;
      if (elapsed < this.intervalMs) {
        // Check if enough reviews accumulated
        const countKey = `${AI_REVIEW_COUNT_KEY}${commandSlug}`;
        const newReviews = await this.redis.get<number>(countKey);
        if (!newReviews || newReviews < this.minReviews) {
          return false; // Not enough reviews and not enough time
        }
      }
    }

    return true;
  }

  /** Mark that a summary was generated (start cooldown) */
  async markGenerated(commandSlug: string): Promise<void> {
    const cooldownTtl = Math.ceil(this.intervalMs / 1000);
    await this.redis.set(`${AI_COOLDOWN_KEY}${commandSlug}`, Date.now(), cooldownTtl);
    await this.redis.del(`${AI_REVIEW_COUNT_KEY}${commandSlug}`);
    this.logger.debug(`AI cooldown started for ${commandSlug} (${cooldownTtl}s)`);
  }

  /** Increment new review count for a command */
  async trackNewReview(commandSlug: string): Promise<number> {
    const key = `${AI_REVIEW_COUNT_KEY}${commandSlug}`;
    const current = (await this.redis.get<number>(key)) || 0;
    const next = current + 1;
    await this.redis.set(key, next, 3600); // 1hr TTL
    return next;
  }

  /** Get cached AI result (avoid recompute) */
  async getCachedResult<T>(commandSlug: string): Promise<T | null> {
    return this.redis.get<T>(`${AI_RESULT_CACHE_KEY}${commandSlug}`);
  }

  /** Cache AI result */
  async cacheResult(commandSlug: string, result: any, ttlSeconds = 600): Promise<void> {
    await this.redis.set(`${AI_RESULT_CACHE_KEY}${commandSlug}`, result, ttlSeconds);
  }
}
