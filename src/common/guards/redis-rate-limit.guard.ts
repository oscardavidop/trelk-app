import { Injectable, CanActivate, ExecutionContext, HttpStatus, Logger } from '@nestjs/common';
import { AppError, ErrorCode } from '../errors';
import { Reflector } from '@nestjs/core';
import { RedisCacheService } from '../../modules/redis/redis-cache.service';
import { createHash } from 'crypto';

export interface RateLimitConfig {
    /** Max requests in window */
    limit: number;
    /** Window in seconds */
    window: number;
    /** What to key on: 'user' | 'ip' | 'endpoint' | 'slug' */
    keyType: 'user' | 'ip' | 'endpoint' | 'slug';
    /** Custom key suffix (for slug-based limits) */
    keyParam?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit_config';

/**
 * Redis-backed distributed rate limiter.
 * Supports per-user, per-IP, per-endpoint, per-slug limits.
 * Uses sliding window counter in Redis.
 */
@Injectable()
export class RedisRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RedisRateLimitGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisCacheService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const configs = this.reflector.getAllAndOverride<RateLimitConfig[]>(RATE_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!configs?.length) return true;
        if (!this.redis.available) return true; // Fallback: allow if Redis down

        const request = context.switchToHttp().getRequest();

        for (const config of configs) {
            const key = this.buildKey(config, request);
            const allowed = await this.checkLimit(key, config.limit, config.window);

            if (!allowed) {
                const ttl = await this.getTTL(key);
                throw new AppError(
                    ErrorCode.RATE_LIMITED,
                    `Too many requests. Limit: ${config.limit}/${config.window}s`,
                    429,
                    { retryIn: ttl },
                    true,
                );
            }
        }

        return true;
    }

    private buildKey(config: RateLimitConfig, request: any): string {
        const parts = ['rl'];

        switch (config.keyType) {
            case 'user': {
                const user = request.user;
                const uid = user?.authTelegram?.id || user?.authUser?.telegramId || user?.authUser?.id || 'anon';
                parts.push('u', String(uid));
                break;
            }
            case 'ip': {
                // add cloudfare header support
                const ip = request.headers['cf-connecting-ip'] || request.headers['x-real-ip'] || request.headers['x-forwarded-for']?.split(',')[0] || request.ip;
                parts.push('ip', this.hashIP(ip));
                break;
            }
            case 'endpoint': {
                const url = (request.routeOptions?.url || request.url).replace(/\/+$/, '').split('?')[0];
                parts.push('ep', request.method, url);
                break;
            }
            case 'slug': {
                const slug = request.params?.[config.keyParam || 'command'] || request.params?.slug || 'unknown';
                const user = request.user;
                const uid = user?.authTelegram?.id || user?.authUser?.telegramId || 'anon';
                parts.push('slug', slug, String(uid));
                break;
            }
        }

        return parts.join(':');
    }

    private async checkLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
        try {
            const now = Date.now();
            const windowMs = windowSec * 1000;
            const windowKey = `${key}:${Math.floor(now / windowMs)}`;

            const current = await this.redis.incr(windowKey);
            if (current === 1) {
                await this.redis.expire(windowKey, windowSec + 1);
            }

            return current <= limit;
        } catch {
            return true; // Fail open
        }
    }

    private async getTTL(key: string): Promise<number> {
        try {
            const now = Date.now();

            // Estimate remaining time in current window
            // Since we can't easily scan keys, return a reasonable estimate
            return 30;
        } catch {
            return 30;
        }
    }

    private hashIP(ip: string): string {
        return createHash('sha256').update(ip).digest('hex').slice(0, 16);
    }
}
