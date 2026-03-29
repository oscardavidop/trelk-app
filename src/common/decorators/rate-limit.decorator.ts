import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitConfig, RedisRateLimitGuard } from '../guards/redis-rate-limit.guard';

/**
 * Apply Redis-based distributed rate limiting to a route.
 * Supports multiple layers per endpoint.
 *
 * @example
 * // 5 req/min per user + 20/min per IP
 * @RateLimit(
 *   { limit: 5, window: 60, keyType: 'user' },
 *   { limit: 20, window: 60, keyType: 'ip' },
 * )
 */
export function RateLimit(...configs: RateLimitConfig[]) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, configs),
    UseGuards(RedisRateLimitGuard),
  );
}

// === Presets — common rate limit patterns ===

/** Reviews: 5 req/min per user */
export const ReviewRateLimit = () => RateLimit(
  { limit: 5, window: 60, keyType: 'user' },
  { limit: 15, window: 60, keyType: 'ip' },
);

/** Reports: 2 req/min per user */
export const ReportRateLimit = () => RateLimit(
  { limit: 2, window: 60, keyType: 'user' },
  { limit: 5, window: 60, keyType: 'ip' },
);

/** Command endpoints: 30 req/min per user per slug */
export const CommandRateLimit = () => RateLimit(
  { limit: 30, window: 60, keyType: 'slug', keyParam: 'command' },
  { limit: 60, window: 60, keyType: 'user' },
);

/** Auth endpoints: 10 req/min per IP */
export const AuthRateLimit = () => RateLimit(
  { limit: 10, window: 60, keyType: 'ip' },
);

/** Write operations: 10 req/min per user */
export const WriteRateLimit = () => RateLimit(
  { limit: 10, window: 60, keyType: 'user' },
  { limit: 20, window: 60, keyType: 'ip' },
);

/** Suggestions: 3 req/hour per user */
export const SuggestionRateLimit = () => RateLimit(
  { limit: 3, window: 3600, keyType: 'user' },
);
