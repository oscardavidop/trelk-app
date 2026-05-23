import {
  Controller, Get, Post, Param, Query, UseGuards, Req, UnauthorizedException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('api/v1/ui/payments')
@UseGuards(BearerAuthGuard)
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  private extractTelegramId(req: any): string {
    const user = req.user;
    const tgId = user?.authTelegram?.id || user?.authUser?.telegramId || user?.authUser?.id;
    if (!tgId || Number.isNaN(Number(tgId)) || Number(tgId) <= 0) {
      throw new UnauthorizedException('Invalid authenticated Telegram user');
    }
    return String(tgId);
  }

  @Get('summary')
  async summary(@Req() req: any) {
    const userId = this.extractTelegramId(req);
    const data = await this.svc.getSummary(userId);
    return { ok: true, ...data };
  }

  @Get('subscriptions')
  async subscriptions(
    @Req() req: any,
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
  ) {
    const userId = this.extractTelegramId(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const data = await this.svc.getSubscriptions(userId, cursor || undefined, limit);
    return { ok: true, ...data };
  }

  @Get('subscriptions/:id')
  async subscriptionDetail(@Param('id') id: string, @Req() req: any) {
    const userId = this.extractTelegramId(req);
    const sub = await this.svc.getSubscriptionDetail(userId, id);
    return { ok: true, subscription: sub };
  }

  @Get('subscriptions/:id/events')
  async subscriptionEvents(@Param('id') id: string, @Req() req: any) {
    const userId = this.extractTelegramId(req);
    const events = await this.svc.getSubscriptionEvents(userId, id);
    return { ok: true, events };
  }

  @Get('history')
  async history(
    @Req() req: any,
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
    @Query('eventType') eventType: string,
  ) {
    const userId = this.extractTelegramId(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const data = await this.svc.getHistory(userId, cursor || undefined, limit, eventType || undefined);
    return { ok: true, ...data };
  }

  @Post('subscriptions/:id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const userId = this.extractTelegramId(req);
    const result = await this.svc.cancelSubscription(userId, id);
    return result;
  }
}
