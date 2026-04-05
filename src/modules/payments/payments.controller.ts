import {
  Controller, Get, Post, Param, Query, UseGuards,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('api/v1/ui/payments')
@UseGuards(BearerAuthGuard)
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get('summary')
  async summary() {
    const data = await this.svc.getSummary();
    return { ok: true, ...data };
  }

  @Get('subscriptions')
  async subscriptions(
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const data = await this.svc.getSubscriptions(undefined, cursor || undefined, limit);
    return { ok: true, ...data };
  }

  @Get('subscriptions/:id')
  async subscriptionDetail(@Param('id') id: string) {
    const sub = await this.svc.getSubscriptionDetail(undefined, id);
    return { ok: true, subscription: sub };
  }

  @Get('subscriptions/:id/events')
  async subscriptionEvents(@Param('id') id: string) {
    const events = await this.svc.getSubscriptionEvents(undefined, id);
    return { ok: true, events };
  }

  @Get('history')
  async history(
    @Query('cursor') cursor: string,
    @Query('limit') limitStr: string,
    @Query('eventType') eventType: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const data = await this.svc.getHistory(undefined, cursor || undefined, limit, eventType || undefined);
    return { ok: true, ...data };
  }

  @Post('subscriptions/:id/cancel')
  async cancel(@Param('id') id: string) {
    const result = await this.svc.cancelSubscription(undefined, id);
    return result;
  }
}
