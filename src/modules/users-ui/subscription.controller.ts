// src/modules/users-ui/subscription.controller.ts
// REST JSON endpoints for subscription management
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from '../users/user.service';
import { ChangePlanDto, AutoRenewDto } from '../users/dto/subscription.dto';
import { AppError, ErrorCode } from '../../common/errors';

@Controller('api/v1/ui/subscription')
@UseGuards(BearerAuthGuard)
export class SubscriptionController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/v1/ui/subscription — full subscription + pro_features */
  @Get()
  async getSubscription(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const data = await this.userService.getSubscription(telegramId);
    if (!data) throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    return { ok: true, ...data };
  }

  /** POST /api/v1/ui/subscription/change — request plan upgrade/downgrade */
  @Post('change')
  async changePlan(@Body() dto: ChangePlanDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.requestPlanChange(telegramId, dto.plan);
    return { ok: true, msg: `Plan change to ${dto.plan} processed` };
  }

  /** POST /api/v1/ui/subscription/cancel-change — cancel pending plan change */
  @Post('cancel-change')
  async cancelChange(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.cancelPlanChange(telegramId);
    return { ok: true, msg: 'Pending change canceled' };
  }

  /** PATCH /api/v1/ui/subscription/auto-renew — toggle auto-renew */
  @Patch('auto-renew')
  async setAutoRenew(@Body() dto: AutoRenewDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.setAutoRenew(telegramId, dto.auto_renew);
    return { ok: true, auto_renew: dto.auto_renew };
  }

  // ── Helpers ─────────────────────────────────────

  private extractTelegramId(req: any): number {
    const user = req.user;
    return (
      user.authTelegram?.id ||
      user.authUser?.telegramId ||
      user.authUser?.id
    );
  }
}
