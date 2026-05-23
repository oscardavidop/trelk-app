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
  UnauthorizedException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from '../users/user.service';
import { LocaleDto } from '../users/dto/api.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppError, ErrorCode } from '../../common/errors';

@Controller('api/v1/ui/config')
@UseGuards(BearerAuthGuard)
export class ConfigController {
  constructor(private readonly userService: UserService) { }

  /** GET /api/v1/ui/config — full user config */
  @Get()
  async getConfig(@Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const data = await this.userService.getFullConfig(telegramId);
    if (!data) throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    return { ok: true, ...data };
  }

  // ── Commands ────────────────────────────────────

  /** PATCH /api/v1/ui/config/commands/:key — partial command config update */
  @Patch('commands/:key')
  async patchCommand(
    @Param('key') key: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid request body', 400, { expected: 'object' });
    }
    const telegramId = this.extractTelegramId(req);
    await this.userService.patchCommandConfig(telegramId, key, body);
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
    if (!body.alias) throw new AppError(ErrorCode.VALIDATION_ERROR, 'alias is required', 400);
    const telegramId = this.extractTelegramId(req);
    await this.userService.upsertPremiumCommand(telegramId, key, body.alias, req.user.authUser.pro_features, req.user.authUser.config.premium_commands);
    return { ok: true };
  }

  /** DELETE /api/v1/ui/config/premium/:key — delete a premium command */
  @Delete('premium/:key')
  async deletePremiumCommand(@Param('key') key: string, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const result = await this.userService.deletePremiumCommand(telegramId, key);
    if (!result.modifiedCount) {
      throw new AppError(ErrorCode.COMMAND_NOT_FOUND, 'Command not found', 404);
    } 
    return { ok: true };
  }
  // ── Locale ──────────────────────────────────────

  /** PATCH /api/v1/ui/config/locale — partial update locale */
  @Patch('locale')
  async updateLocale(@Body() dto: LocaleDto, @Req() req: any) {
    const telegramId = this.extractTelegramId(req);
    const body = plainToInstance(LocaleDto, dto);

    const errors = await validate(body, {
      whitelist: true,
      stopAtFirstError: true,
    });

    if (errors.length > 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid locale', 400, { errors: this.formatErrors(errors) });
    }

    await this.userService.updateLocale(telegramId, body);
    return { ok: true };
  }


  // ── Helpers ─────────────────────────────────────

  private extractTelegramId(req: any): number {
    const user = req.user;
    const telegramId = (
      user.authTelegram?.id ||
      user.authUser?.telegramId ||
      user.authUser?.id
    );

    if (!telegramId || Number.isNaN(Number(telegramId)) || Number(telegramId) <= 0) {
      throw new UnauthorizedException('Invalid authenticated Telegram user');
    }

    return Number(telegramId);
  }

  private formatErrors(validationErrors: any[]): any[] {
   return validationErrors.reduce((acc, err) => {
        if (err.constraints) {
          acc.push({
            property: err.property,
            message: Object.values(err.constraints).join(', ')
          });
        }
        if (err.children?.length) {
          acc.push(...this.formatErrors(err.children));
        }
        return acc;
      }, []);
  };
}


