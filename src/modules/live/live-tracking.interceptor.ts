import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LiveService } from './live.service';

/**
 * Tracks active users and command executions for live metrics.
 * Fire-and-forget — never blocks the response.
 */
@Injectable()
export class LiveTrackingInterceptor implements NestInterceptor {
  constructor(private readonly live: LiveService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        next: () => {
          const req = context.switchToHttp().getRequest();
          const userId =
            req.user?.authTelegram?.id ||
            req.user?.authUser?.telegramId;

          if (userId) {
            // Fire-and-forget: don't await
            this.live.trackActiveUser(userId).catch(() => {});
          }

          // Track command executions from the bot history endpoint
          const url: string = req.url || '';
          if (url.includes('/api/v1/ui/history') && req.method === 'POST') {
            const slug = req.body?.command?.replace('/', '');
            if (slug) {
              this.live.trackCommand(slug).catch(() => {});
            }
          }
        },
      }),
    );
  }
}
