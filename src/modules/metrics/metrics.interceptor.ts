import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Global interceptor that records request latency and errors.
 * Applied as APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics.recordRequest(Date.now() - start, false);
        },
        error: () => {
          this.metrics.recordRequest(Date.now() - start, true);
        },
      }),
    );
  }
}
