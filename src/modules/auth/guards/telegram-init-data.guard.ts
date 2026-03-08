// src/modules/auth/guards/telegram-init-data.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramAuthService } from '../services/telegram-auth.service';

/**
 * Guard reutilizable que valida el initData de Telegram en cada request.
 *
 * Uso:
 *   @UseGuards(TelegramInitDataGuard)
 *   @Post('some-endpoint')
 *
 * Espera recibir el initData en:
 *   - Body field: `initData` o `_auth`
 *   - Header: `x-telegram-init-data`
 *
 * Si la validación es exitosa, inyecta `req.telegramUser` con los datos validados.
 */
@Injectable()
export class TelegramInitDataGuard implements CanActivate {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extraer initData de múltiples fuentes (prioridad: body > header)
    const initData =
      request.body?.initData ??
      request.body?._auth ??
      request.headers?.['x-telegram-init-data'];

    if (!initData) {
      throw new UnauthorizedException('INIT_DATA_NOT_PROVIDED');
    }

    // Validar y adjuntar al request
    const result = this.telegramAuthService.validateInitData(initData);
    request.telegramUser = result.user;
    request.telegramInitData = result;

    return true;
  }
}
