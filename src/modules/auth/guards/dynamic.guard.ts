import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelegramAuthService } from '../services/telegram-auth.service';

/**
 * Guard dinámico que selecciona la estrategia de autenticación
 * basándose en el campo `method` del body de la request.
 *
 * - method=auth → Valida initData de Telegram (HMAC-SHA256)
 * - method=changeSettings/updateConfig → Valida cookie de sesión
 */
@Injectable()
export class DynamicAuthGuard implements CanActivate {
  constructor(
    private readonly telegramAuthService: TelegramAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const method = req.body?.method;

    if (['changeSettings', 'updateConfig'].includes(method)) {
      // Usa la estrategia Bearer para acciones autenticadas vía sesión
      const guard = new (AuthGuard('bearer'))();
      return guard.canActivate(context) as Promise<boolean>;
    }

    if (method === 'auth') {
      // Validar initData directamente con TelegramAuthService
      const initData = req.body?._auth;
      if (!initData || initData === '-') {
        throw new UnauthorizedException('expired-session');
      }

      try {
        const result = this.telegramAuthService.validateInitData(initData);
        // Poner datos en req.telegramUser para que el controller los use
        req.telegramUser = result.user;
        req.telegramInitData = result;
        return true;
      } catch (err) {
        // Preserve the specific INIT_DATA_* error for accurate API responses.
        throw err;
      }
    }

    throw new UnauthorizedException('Método no soportado');
  }
}
