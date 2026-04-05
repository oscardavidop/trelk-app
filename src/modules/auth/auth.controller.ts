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
  Delete,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { BearerAuthGuard, JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { AppError, ErrorCode } from '../../common/errors';

/**
 * DTO para el endpoint de login desde Telegram Mini App.
 * Solo necesita el initData crudo que provee el SDK de Telegram.
 */
interface TelegramLoginDto {
  initData: string;
}

@Controller("api/v1/auth")
@UseGuards(BearerAuthGuard)
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
  @RateLimit({ limit: 10, window: 60, keyType: 'ip' })
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
   * Devuelve los datos del uxsuario autenticado.
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
  @RateLimit({ limit: 10, window: 60, keyType: 'ip' })
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

  // ─── Sessions Management ───

  /** Extract session_id from Authorization: Bearer <session_id> header */
  private extractSessionId(req: any): string | undefined {
    const h = req.headers?.authorization;
    return h?.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
  }

  /**
   * GET /auth/sessions
   *
   * Returns all active (non-revoked) sessions for the current user.
   * Protected by class-level BearerAuthGuard (session_id based).
   */
  @Get("sessions")
  async getSessions(@Req() req: any) {
    const telegramId = req.user?.authUser?.telegramId ?? req.user?.authTelegram?.id;
    if (!telegramId) throw new UnauthorizedException('USER_NOT_FOUND');

    const currentSessionId = this.extractSessionId(req);
    const sessions = await this.authService.tokenModel.find({
      sub: telegramId,
      revoked: false,
    }).sort({ createdAt: -1 }).lean().exec();

    return {
      ok: true,
      sessions: sessions.map((s: any) => ({
        id: s.token,
        device: s.device || this.parseDevice(s.userAgent),
        browser: s.browser,
        os: s.os,
        ip: s.ip,
        platform: s.platform,
        location: s.locationCity
          ? `${s.locationCity}, ${s.locationCountry || ''}`
          : s.locationCountry || null,
        createdAt: s.createdAt,
        lastUsed: s.lastUsed || s.createdAt,
        isCurrent: s.session_id === currentSessionId,
      })),
    };
  }

  /**
   * DELETE /auth/sessions/:id
   *
   * Revoke a specific session (cannot revoke current session — use /logout).
   * Protected by class-level BearerAuthGuard (session_id based).
   */
  @Delete("sessions/:id")
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Param('id') sessionTokenId: string, @Req() req: any) {
    const telegramId = req.user?.authUser?.telegramId ?? req.user?.authTelegram?.id;
    if (!telegramId) throw new UnauthorizedException('USER_NOT_FOUND');

    const token = await this.authService.tokenModel.findOne({
      token: sessionTokenId,
      sub: telegramId,
      revoked: false,
    }).exec();

    if (!token) {
      throw new AppError(ErrorCode.SESSION_NOT_FOUND, 'Session not found', 404);
    }

    token.revoked = true;
    await token.save();

    return { ok: true, message: 'Session revoked' };
  }

  /**
   * DELETE /auth/sessions
   *
   * Revoke all sessions except current.
   * Protected by class-level BearerAuthGuard (session_id based).
   */
  @Delete("sessions")
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Req() req: any) {
    const telegramId = req.user?.authUser?.telegramId ?? req.user?.authTelegram?.id;
    if (!telegramId) throw new UnauthorizedException('USER_NOT_FOUND');

    const currentSessionId = this.extractSessionId(req);

    const result = await this.authService.tokenModel.updateMany(
      { sub: telegramId, revoked: false, ...(currentSessionId ? { session_id: { $ne: currentSessionId } } : {}) },
      { $set: { revoked: true } },
    ).exec();

    return { ok: true, revoked: result.modifiedCount };
  }

  private parseDevice(ua?: string): string {
    if (!ua) return 'Unknown device';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown device';
  }
}
