import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsInterceptor, CircuitBreakerService],
  exports: [MetricsService, CircuitBreakerService],
})
export class MetricsModule {}
