import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from "../users/schemas/user.schema";
import { Token, TokenDocument } from "./schemas/token.schema";
import { UserService, TelegramUserData } from "../users/user.service";
import { TelegramAuthService, TelegramInitDataResult } from "./services/telegram-auth.service";

/** Payload que se firma dentro del JWT */
export interface JwtPayloadCustom {
  sub: string;       // MongoDB _id
  telegramId: number;
  username: string;
  jti: string;       // Token ID único (referencia al doc Token)
  iat: number;
  exp: number;
}

/** Respuesta del flujo de login completo */
export interface LoginResult {
  accessToken: string;
  user: {
    id: number;
    telegramId: number;
    firstName: string;
    lastName: string;
    username: string;
    photoUrl: string;
    lang: string;
    tz: string;
    preferences: Record<string, boolean>;
  };
  expiresIn: number;
  sessionId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Duración del JWT en segundos (desde env o 24h default) */
  private get JWT_EXPIRATION(): number {
    return this.configService.get<number>('JWT_EXPIRATION', 86400);
  }

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'secret');
  }

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Token.name,)
    public readonly tokenModel: Model<TokenDocument>,

    @Inject(forwardRef(() => UserService))
    public readonly userService: UserService,

    private readonly telegramAuthService: TelegramAuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Flujo principal de login desde Telegram Mini App ───

  /**
   * Flujo completo: valida initData → find/create user → genera JWT → registra token.
   *
   * Este es el ÚNICO punto de entrada para autenticación desde Telegram.
   */
  async loginFromTelegram(
    initData: string,
    meta?: { ip?: string; userAgent?: string; platform?: string },
  ): Promise<LoginResult> {
    // 1. Validar initData (HMAC + auth_date + estructura)
    const validated: TelegramInitDataResult =
      this.telegramAuthService.validateInitData(initData);

    // 2. Find or create usuario
    const user = await this.userService.findOrCreateFromTelegram(validated.user);

    // 3. Revocar tokens previos del usuario (opcional: sesión única)
    // await this.revokeAllUserTokens(user.telegramId);

    // 4. Generar JWT + registrar token en DB
    const { accessToken, sessionId } = await this.generateTokenPair(user, meta);

    this.logger.log(
      `Login exitoso: telegramId=${user.telegramId}, userId=${user._id}`,
    );

    return {
      accessToken,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName ?? '',
        username: user.username ?? '',
        photoUrl: user.photoUrl ?? '',
        lang: user.lang,
        tz: user.tz,
        preferences: user.preferences ?? {},
      },
      expiresIn: this.JWT_EXPIRATION,
      sessionId,
    };
  }

  // ─── Generación de JWT ───

  /**
   * Genera un JWT firmado y persiste el token en MongoDB.
   */
  private async generateTokenPair(
    user: UserDocument,
    meta?: { ip?: string; userAgent?: string; platform?: string },
  ): Promise<{ accessToken: string; sessionId: string }> {
    const jti = crypto.randomUUID();
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Math.floor(Date.now() / 1000);

    const payload: JwtPayloadCustom = {
      sub: user._id.toString(),
      telegramId: user.telegramId,
      username: user.username ?? '',
      jti,
      iat: now,
      exp: now + this.JWT_EXPIRATION,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret);

    // Persistir token en DB para revocación y auditoría
    await this.tokenModel.create({
      token: jti,
      sub: user.telegramId,
      session_id: sessionId,
      type: 'telegram-miniapp',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      platform: meta?.platform ?? 'telegram',
      revoked: false,
      userTlg: {
        id: user.telegramId,
        firstName: user.firstName,
        username: user.username,
      },
    });

    return { accessToken, sessionId };
  }

  // ─── Gestión de tokens ───

  async create(data: Partial<Token>): Promise<Token> {
    const token = new this.tokenModel(data);
    return token.save();
  }

  async findByToken(token: string): Promise<Token | null> {
    return this.tokenModel.findOne({ token }).exec();
  }

  async revoke(token: string): Promise<Token | null> {
    return this.tokenModel.findOneAndUpdate(
      { token },
      { revoked: true },
      { new: true },
    ).exec();
  }

  async findValidToken(userId: number): Promise<TokenDocument | null> {
    const oneHourAgo = new Date(Date.now() - 3600000);
    return this.tokenModel.findOne({
      sub: userId,
      revoked: false,
      createdAt: { $gte: oneHourAgo },
    }).sort({ createdAt: -1 }).exec();
  }

  async revokeAllUserTokens(telegramId: number): Promise<void> {
    await this.tokenModel.updateMany(
      { sub: telegramId, revoked: false },
      { $set: { revoked: true } },
    ).exec();
  }

  /**
   * Valida un JWT y verifica que el token no esté revocado.
   * Usado por JwtStrategy y middleware.
   */
  async validateJwt(token: string): Promise<{ user: UserDocument; payload: JwtPayloadCustom }> {
    let payload: JwtPayloadCustom;

    try {
      payload = jwt.verify(token, this.jwtSecret) as JwtPayloadCustom;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('TOKEN_INVALID');
      }
      throw new UnauthorizedException('TOKEN_VERIFICATION_FAILED');
    }

    // Verificar que el token no esté revocado
    const tokenDoc = await this.tokenModel.findOne({
      token: payload.jti,
      revoked: false,
    }).exec();

    if (!tokenDoc) {
      throw new UnauthorizedException('TOKEN_REVOKED');
    }

    // Buscar usuario
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    return { user, payload };
  }
}
