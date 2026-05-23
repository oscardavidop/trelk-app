import { Controller, Get, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeepLinkService } from './deep-link.service';

function extractUserId(req: any): number {
  const u = req.user;
  const userId = u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id;
  if (!userId || Number.isNaN(Number(userId)) || Number(userId) <= 0) {
    throw new UnauthorizedException('Invalid authenticated Telegram user');
  }
  return Number(userId);
}

@Controller('api/v1/ui/deep-link')
@UseGuards(BearerAuthGuard)
export class DeepLinkController {
  constructor(private readonly deepLink: DeepLinkService) {}

  /** GET /api/v1/ui/deep-link/resolve?start=cmd_play — Resolve a start param */
  @Get('resolve')
  async resolve(@Query('start') start: string, @Req() req: any) {
    const userId = extractUserId(req);
    const sanitized = (start || '').slice(0, 200);
    const intent = this.deepLink.parse(sanitized, userId);
    return { ok: true, ...intent };
  }
}
