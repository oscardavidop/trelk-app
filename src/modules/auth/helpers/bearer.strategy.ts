import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Token, TokenDocument } from '../schemas/token.schema';
import { AuthService } from '../auth.service';
import { RedisCacheService } from '../../redis/redis-cache.service';

@Injectable()
export class BearerStrategy extends PassportStrategy(Strategy, 'bearer') {
    private readonly logger = new Logger(BearerStrategy.name);
    private readonly sessionTtlMs: number;

    constructor(
        @InjectModel(User.name, 'mbot') private readonly userModel: Model<UserDocument>,
        @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
        private readonly authService: AuthService,
        private readonly redis: RedisCacheService,
        configService: ConfigService,
    ) {
        super();
        this.sessionTtlMs = (configService.get<number>('JWT_EXPIRATION', 86400)) * 1000;
    }

    async validate(req: any): Promise<any> {
        let sessionId: string | undefined;

        // 1) Authorization header (preferred)
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionId = authHeader.slice(7).trim();
        }

        // 2) Fallback: ?token= query param (for <img src>, SSE, etc.)
        if (!sessionId) {
            sessionId = (req.query?.token as string)?.trim();
        }

        if (!sessionId) {
            throw new UnauthorizedException('expired-session-view');
        }

        // === Try 1: Redis cache (sub-ms) ===
        const cached = await this.redis.getSession(sessionId);
        if (cached) {
            return cached;
        }

        // === Try 2: MongoDB (fallback) ===
        const tokenDoc = await this.tokenModel.findOne({
            session_id: sessionId,
            revoked: false,
        }).exec();

        if (!tokenDoc) {
            throw new UnauthorizedException('expired-session-view');
        }

        // Check session TTL
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
                first_name: user.data?.first_name ?? '',
                last_name: user.data?.last_name ?? '',
                username: user.data?.username ?? '',
            },
        };

        // Cache in Redis for subsequent requests
        const remainingMs = new Date(tokenDoc.createdAt).getTime() + this.sessionTtlMs - Date.now();
        if (remainingMs > 0) {
            await this.redis.setSession(sessionId, result, Math.floor(remainingMs / 1000));
        }

        return result;
    }
}
