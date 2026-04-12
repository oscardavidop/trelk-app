import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';
import { RedisCacheService } from '../redis/redis-cache.service';

export interface AlertItem {
    id: string;
    publicId: string;
    text: string;
    chatId: number;
    runAt: number;
    createdAt: number;
    secondsLeft: number;
    totalSeconds: number;
    type: string;
    status: 'scheduled' | 'expired';
}

interface AlertJob {
    id: string;
    public_id: string;
    run: string | number;
    timestamp: number;
    type: string;
    util: any;
    seconds: number;
}

@Injectable()
export class AlertsService {
    private readonly logger = new Logger(AlertsService.name);
    private readonly redis: Redis;

    constructor(
        private readonly config: ConfigService,
        private readonly redisCache: RedisCacheService,
    ) {
        this.redis = this.redisCache.getClient() as Redis;
    }

    async getAlerts(userId: number): Promise<AlertItem[]> {
        const raw = await this.redis.hgetall(`${userId}:alerts`);
        const now = Date.now();

        const alerts: AlertItem[] = Object.values(raw)
            .map((val) => {
                try {
                    const job: AlertJob = JSON.parse(val);
                    const util = typeof job.util === 'string' ? JSON.parse(job.util) : job.util;
                    const runAt = new Date(job.run).getTime();
                    const secondsLeft = Math.max(0, Math.floor((runAt - now) / 1000));

                    return {
                        id: job.id,
                        publicId: job.public_id || '',
                        text: util?.text || '',
                        chatId: util?.from_id || 0,
                        runAt,
                        createdAt: job.timestamp || 0,
                        secondsLeft,
                        totalSeconds: job.seconds || 0,
                        type: job.type || 'sendMessage',
                        status: runAt > now ? 'scheduled' : 'expired',
                    } as AlertItem;
                } catch {
                    return null;
                }
            })
            .filter((a): a is AlertItem => a !== null);

        // Sort by execution time ASC (closest first)
        alerts.sort((a, b) => a.runAt - b.runAt);

        return alerts;
    }

    async getAlert(userId: number, alertId: string): Promise<AlertItem> {
        const raw = await this.redis.hget(`${userId}:alerts`, alertId);
        if (!raw) throw new NotFoundException('ALERT_NOT_FOUND');

        const job: AlertJob = JSON.parse(raw);
        const util = typeof job.util === 'string' ? JSON.parse(job.util) : job.util;
        const now = Date.now();
        const runAt = new Date(job.run).getTime();

        return {
            id: job.id,
            publicId: job.public_id || '',
            text: util?.text || '',
            chatId: util?.from_id || 0,
            runAt,
            createdAt: job.timestamp || 0,
            secondsLeft: Math.max(0, Math.floor((runAt - now) / 1000)),
            totalSeconds: job.seconds || 0,
            type: job.type || 'sendMessage',
            status: runAt > now ? 'scheduled' : 'expired',
        };
    }

    async deleteAlert(userId: number, alertId: string): Promise<void> {
        const exists = await this.redis.hexists(`${userId}:alerts`, alertId);
        if (!exists) throw new NotFoundException('ALERT_NOT_FOUND');

        await this.redis.hdel(`${userId}:alerts`, alertId);
    }

    async deleteAllAlerts(userId: number): Promise<number> {
        const keys = await this.redis.hkeys(`${userId}:alerts`);
        if (!keys.length) return 0;

        await this.redis.del(`${userId}:alerts`);
        return keys.length;
    }
}
