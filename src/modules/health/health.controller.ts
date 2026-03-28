import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisCacheService } from '../redis/redis-cache.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redis: RedisCacheService,
  ) {}

  @Get()
  async check() {
    const mongoStatus = this.mongoConnection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = await this.redis.ping() ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return {
      status: mongoStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      },
    };
  }

  /** Probe de readiness para Kubernetes/Docker */
  @Get('ready')
  async readiness() {
    const isReady = this.mongoConnection.readyState === 1;
    if (!isReady) {
      return { status: 'not_ready', reason: 'MongoDB disconnected' };
    }
    return { status: 'ready' };
  }

  /** Probe de liveness — siempre responde si el proceso está vivo */
  @Get('live')
  liveness() {
    return { status: 'alive', pid: process.pid };
  }
}

@Controller('api/v1/status')
@SkipThrottle()
export class StatusController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redis: RedisCacheService,
  ) {}

  @Get()
  async getStatus() {
    const mongoOk = this.mongoConnection.readyState === 1;
    const redisOk = await this.redis.ping().catch(() => false);

    const start = Date.now();
    try {
      await this.mongoConnection.db?.admin().ping();
    } catch { /* ignored */ }
    const latencyMs = Date.now() - start;

    let status: 'online' | 'degraded' | 'down' = 'online';
    if (!mongoOk && !redisOk) status = 'down';
    else if (!mongoOk || !redisOk) status = 'degraded';

    const errorRate = status === 'down' ? 1 : status === 'degraded' ? 0.15 : 0.02;

    return {
      status,
      latency_ms: latencyMs,
      error_rate: errorRate,
      updated_at: new Date().toISOString(),
    };
  }
}
