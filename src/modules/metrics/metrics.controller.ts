import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { CircuitBreakerV2Service } from '../../core/resilience/circuit-breaker-v2.service';

@Controller('api/v1/metrics')
@SkipThrottle()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly circuitBreaker: CircuitBreakerV2Service,
  ) {}

  /** GET /api/v1/metrics — observability snapshot */
  @Get()
  async getMetrics() {
    const [snapshot, circuits] = await Promise.all([
      this.metrics.getSnapshot(),
      this.circuitBreaker.getSnapshots(['ai-summary', 'moderation', 'telegram-api']),
    ]);

    return {
      ok: true,
      ...snapshot,
      circuits,
    };
  }
}
