import { Controller, Post, Get, Body, Req, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsTrackingService } from './analytics-tracking.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

function extractUserId(req: any): number {
  const u = req.user;
  return u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id || 0;
}

@Controller('api/v1/ui/analytics')
@UseGuards(BearerAuthGuard)
export class AnalyticsTrackingController {
  constructor(private readonly analytics: AnalyticsTrackingService) {}

  /** POST /api/v1/ui/analytics/track — Track a single event */
  @Post('track')
  @RateLimit({ limit: 60, window: 60, keyType: 'user' })
  async track(@Req() req: any, @Body() body: { event: string; properties?: Record<string, any>; sessionId?: string }) {
    const userId = extractUserId(req);
    if (!body.event || typeof body.event !== 'string' || body.event.length > 100) {
      throw new BadRequestException('Invalid event name');
    }
    const platform = req.headers['x-platform'] || '';
    this.analytics.track({
      userId,
      event: body.event,
      properties: body.properties,
      sessionId: body.sessionId,
      platform,
    });
    return { ok: true };
  }

  /** POST /api/v1/ui/analytics/batch — Track multiple events at once */
  @Post('batch')
  @RateLimit({ limit: 20, window: 60, keyType: 'user' })
  async batch(@Req() req: any, @Body() body: { events: { event: string; properties?: Record<string, any> }[] }) {
    const userId = extractUserId(req);
    const platform = req.headers['x-platform'] || '';
    if (!Array.isArray(body.events) || body.events.length === 0) {
      throw new BadRequestException('Events array required');
    }
    this.analytics.trackBatch(
      body.events.slice(0, 50).map(e => ({
        userId,
        event: e.event,
        properties: e.properties,
        platform,
      })),
    );
    return { ok: true };
  }

  /** GET /api/v1/ui/analytics/dau — Daily active users */
  @Get('dau')
  async dau(@Query('date') date?: string) {
    const count = await this.analytics.getDailyActiveUsers(date);
    return { ok: true, count };
  }
}
