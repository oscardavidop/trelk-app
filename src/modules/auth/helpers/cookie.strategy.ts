import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Token, TokenDocument } from '../schemas/token.schema';
import { AuthService } from '../auth.service';
import { RedisCacheService } from '../../redis/redis-cache.service';

@Injectable()
export class CookieStrategy extends PassportStrategy(Strategy, 'cookie') {
    private readonly logger = new Logger(CookieStrategy.name);
    private readonly sessionTtlMs: number;

    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
        private readonly authService: AuthService,
        private readonly redis: RedisCacheService,
        configService: ConfigService,
    ) {
        super();
        // Session TTL configurable (default 24h, no 1h)
        this.sessionTtlMs = (configService.get<number>('JWT_EXPIRATION', 86400)) * 1000;
    }

    async validate(req: Request): Promise<any> {
        const sessionId = (req as any).cookies?.session_id;

        if (!sessionId) {
            throw new UnauthorizedException('expired-session-view');
        }

        // === Intento 1: Redis cache (sub-ms) ===
        const cached = await this.redis.getSession(sessionId);
        if (cached) {
            return cached;
        }

        // === Intento 2: MongoDB (fallback) ===
        const tokenDoc = await this.tokenModel.findOne({
            session_id: sessionId,
            revoked: false,
        }).exec();

        if (!tokenDoc) {
            throw new UnauthorizedException('expired-session-view');
        }

        // Session TTL configurable
        if (tokenDoc.createdAt && (new Date(tokenDoc.createdAt).getTime() + this.sessionTtlMs < Date.now())) {
            throw new UnauthorizedException('expired-session-view');
        }

        const user = await this.userModel.findOne({ telegramId: tokenDoc.sub }).exec()
            ?? await this.userModel.findOne({ id: tokenDoc.sub }).exec();

        if (!user) {
            throw new UnauthorizedException('expired-session-view');
        }

        const result = {
            authUser: user.toObject(),
            authTelegram: tokenDoc.userTlg || {
                id: user.telegramId || user.id,
                first_name: user.firstName,
                username: user.username,
            },
        };

        // Guardar en Redis para próximas requests (TTL = tiempo restante de sesión)
        const remainingMs = new Date(tokenDoc.createdAt).getTime() + this.sessionTtlMs - Date.now();
        if (remainingMs > 0) {
            await this.redis.setSession(sessionId, result, Math.floor(remainingMs / 1000));
        }

        return result;
    }
}
