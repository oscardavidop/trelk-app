import { Controller, Get, Req, Res, Query, UseGuards } from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisCacheService } from '../redis/redis-cache.service';
import { FeatureFlagsService } from '../../common/services/feature-flags.service';

/**
 * SSE (Server-Sent Events) controller for realtime signals.
 * Efficient alternative to WebSockets — no persistent connection overhead.
 * Only sends when visible + dynamic interval.
 */
@Controller('api/v1/sse')
@SkipThrottle()
export class SSEController {
  constructor(
    private readonly redis: RedisCacheService,
    private readonly flags: FeatureFlagsService,
  ) {}

  /**
   * GET /api/v1/sse/signals?commands=cmd1,cmd2
   * SSE stream for real-time signals (notifications count, command updates).
   */
  @Get('signals')
  @UseGuards(CookieAuthGuard)
  async signals(
    @Req() req: any,
    @Res() res: any,
    @Query('commands') commandsStr: string,
  ) {
    if (!this.flags.isEnabled('sse')) {
      res.status(503).send({ error: 'SSE disabled' });
      return;
    }

    const userId = this.uid(req);
    const commands = (commandsStr || '').split(',').filter(Boolean).slice(0, 10);

    // SSE headers
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    let alive = true;
    let intervalId: NodeJS.Timeout;

    // Send initial data immediately
    const initial = await this.buildSignalPayload(userId, commands);
    this.sendEvent(res.raw, 'signals', initial);

    // Dynamic interval: check every 10s
    intervalId = setInterval(async () => {
      if (!alive) {
        clearInterval(intervalId);
        return;
      }

      try {
        const payload = await this.buildSignalPayload(userId, commands);
        this.sendEvent(res.raw, 'signals', payload);
      } catch {
        // Non-critical, continue
      }
    }, 10_000);

    // Heartbeat every 30s
    const heartbeatId = setInterval(() => {
      if (!alive) {
        clearInterval(heartbeatId);
        return;
      }
      try {
        res.raw.write(': heartbeat\n\n');
      } catch {
        alive = false;
      }
    }, 30_000);

    // Cleanup on disconnect
    req.raw.on('close', () => {
      alive = false;
      clearInterval(intervalId);
      clearInterval(heartbeatId);
    });
  }

  private async buildSignalPayload(userId: string, commands: string[]): Promise<any> {
    const [unreadCount, commandUpdates] = await Promise.all([
      this.redis.get<number>(`notif:unread:${userId}`) ?? 0,
      this.getCommandUpdates(commands),
    ]);

    return {
      ts: Date.now(),
      unreadNotifications: unreadCount || 0,
      commands: commandUpdates,
    };
  }

  private async getCommandUpdates(commands: string[]): Promise<Record<string, any>> {
    if (!commands.length) return {};

    const result: Record<string, any> = {};
    for (const cmd of commands) {
      const cached = await this.redis.get(`command:stats:${cmd}`);
      if (cached) result[cmd] = cached;
    }
    return result;
  }

  private sendEvent(raw: any, event: string, data: any): void {
    try {
      raw.write(`event: ${event}\n`);
      raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  }

  private uid(req: any): string {
    const u = req.user;
    return String(u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id);
  }
}
