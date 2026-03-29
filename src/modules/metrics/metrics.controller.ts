import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

@Controller('api/v1/metrics')
@SkipThrottle()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /** GET /api/v1/metrics — observability snapshot */
  @Get()
  async getMetrics() {
    const [snapshot, circuits] = await Promise.all([
      this.metrics.getSnapshot(),
      this.circuitBreaker.getStatus(),
    ]);

    return {
      ok: true,
      ...snapshot,
      circuits,
    };
  }
}
