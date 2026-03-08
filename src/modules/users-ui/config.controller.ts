// src/modules/users-ui/config.controller.ts
// REST JSON controller for user config management (commands, premium commands, locale)
import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from '../users/user.service';

@Controller('api/v1/ui/config')
@UseGuards(CookieAuthGuard)
export class ConfigController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/v1/ui/config — full user config */
  @Get()
  async getConfig(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const data = await this.userService.getFullConfig(telegramId);
    if (!data) return { ok: false, error: 'User not found' };
    return { ok: true, ...data };
  }

  // ── Commands ────────────────────────────────────

  /** PUT /api/v1/ui/config/commands/:key — upsert a command */
  @Put('commands/:key')
  async upsertCommand(
    @Param('key') key: string,
    @Body() body: { engine: string; inline?: { results_per_page?: number; show_url?: boolean } },
    @Req() req: any,
  ) {
    if (!body.engine) throw new BadRequestException('engine is required');
    const telegramId = this.extractTelegramId(req);
    await this.userService.upsertCommand(telegramId, key, body);
    return { ok: true };
  }

  /** DELETE /api/v1/ui/config/commands/:key — delete a command */
  @Delete('commands/:key')
  async deleteCommand(@Param('key') key: string, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.deleteCommand(telegramId, key);
    return { ok: true };
  }

  // ── Premium Commands ────────────────────────────

  /** PUT /api/v1/ui/config/premium/:key — upsert a premium command */
  @Put('premium/:key')
  async upsertPremiumCommand(
    @Param('key') key: string,
    @Body() body: { alias: string },
    @Req() req: any,
  ) {
    if (!body.alias) throw new BadRequestException('alias is required');
    const telegramId = this.extractTelegramId(req);
    await this.userService.upsertPremiumCommand(telegramId, key, body.alias);
    return { ok: true };
  }

  /** DELETE /api/v1/ui/config/premium/:key — delete a premium command */
  @Delete('premium/:key')
  async deletePremiumCommand(@Param('key') key: string, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.deletePremiumCommand(telegramId, key);
    return { ok: true };
  }

  // ── Locale ──────────────────────────────────────

  /** PATCH /api/v1/ui/config/locale — partial update locale */
  @Patch('locale')
  async updateLocale(@Body() body: Record<string, any>, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    await this.userService.updateLocale(telegramId, body);
    return { ok: true };
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
