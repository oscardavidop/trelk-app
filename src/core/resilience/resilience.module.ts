import { Global, Module } from '@nestjs/common';
import { CircuitBreakerV2Service } from './circuit-breaker-v2.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { RedisModule } from '../../modules/redis/redis.module';

/**
 * Resilience Module — production-grade reliability layer.
 *
 * Provides:
 * - CircuitBreakerV2Service (enhanced with retry, backoff, provider chains, metrics)
 * - CacheInvalidationService (event-driven cache invalidation + write-through)
 *
 * Global: available to all modules without explicit import.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [CircuitBreakerV2Service, CacheInvalidationService],
  exports: [CircuitBreakerV2Service, CacheInvalidationService],
})
export class ResilienceModule {}
