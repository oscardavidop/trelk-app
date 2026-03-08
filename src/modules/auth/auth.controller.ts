import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Get,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

/**
 * DTO para el endpoint de login desde Telegram Mini App.
 * Solo necesita el initData crudo que provee el SDK de Telegram.
 */
interface TelegramLoginDto {
  initData: string;
}

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * POST /auth/telegram
   *
   * Endpoint principal de autenticación para Telegram Mini Apps.
   * Recibe el initData, valida la firma HMAC, crea/encuentra al usuario y devuelve un JWT.
   *
   * Este es el ÚNICO endpoint que el frontend debe llamar al abrir la Mini App.
   */
  @Post("telegram")
  @HttpCode(HttpStatus.OK)
  async loginFromTelegram(
    @Body() body: TelegramLoginDto,
    @Req() req: any,
  ) {
    const initData = body.initData ?? body['_auth'];

    if (!initData) {
      throw new UnauthorizedException('INIT_DATA_NOT_PROVIDED');
    }

    const meta = {
      ip: req.headers?.['cf-connecting-ip'] ?? req.ip ?? 'unknown',
      userAgent: req.headers?.['user-agent'] ?? 'unknown',
      platform: 'telegram-miniapp',
    };

    const result = await this.authService.loginFromTelegram(initData, meta);

    return {
      ok: true,
      data: result,
    };
  }

  /**
   * GET /auth/me
   *
   * Devuelve los datos del usuario autenticado.
   * Requiere JWT válido en el header Authorization o en body._auth
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = req.user?.auth;

    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    return {
      ok: true,
      data: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        lang: user.lang,
        tz: user.tz,
        preferences: user.preferences,
      },
    };
  }

  /**
   * POST /auth/logout
   *
   * Revoca el token actual del usuario.
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const jti = req.user?.token?.jti;
    if (jti) {
      await this.authService.revoke(jti);
    }
    return { ok: true, message: 'Sesión cerrada' };
  }

  /**
   * POST /auth/refresh
   *
   * Revalida el initData y genera un nuevo JWT (refresh vía Telegram).
   * Útil cuando el JWT expira pero la Mini App sigue abierta.
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshFromTelegram(
    @Body() body: TelegramLoginDto,
    @Req() req: any,
  ) {
    const initData = body.initData ?? body['_auth'];

    if (!initData) {
      throw new UnauthorizedException('INIT_DATA_NOT_PROVIDED');
    }

    const meta = {
      ip: req.headers?.['cf-connecting-ip'] ?? req.ip ?? 'unknown',
      userAgent: req.headers?.['user-agent'] ?? 'unknown',
      platform: 'telegram-miniapp',
    };

    const result = await this.authService.loginFromTelegram(initData, meta);

    return {
      ok: true,
      data: result,
    };
  }
}
