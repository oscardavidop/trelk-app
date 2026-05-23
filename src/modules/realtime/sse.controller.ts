import { Controller, Get, Req, Res, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisCacheService } from '../redis/redis-cache.service';
import { FeatureFlagsService } from '../../common/services/feature-flags.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Token, TokenDocument } from '../auth/schemas/token.schema';

/**
 * SSE (Server-Sent Events) controller for realtime signals.
 * Efficient alternative to WebSockets — no persistent connection overhead.
 * Only sends when visible + dynamic interval.
 * 
 * Uses query param token auth since EventSource can't send custom headers.
 */
@Controller('api/v1/sse')
@SkipThrottle()
export class SSEController {
  constructor(
    private readonly redis: RedisCacheService,
    private readonly flags: FeatureFlagsService,
    @InjectModel(User.name, 'mbot') private readonly userModel: Model<UserDocument>,
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
  ) {}

  /**
   * GET /api/v1/sse/signals?commands=cmd1,cmd2&token=...
   * SSE stream for real-time signals (notifications count, command updates).
   * Token passed as query param since EventSource doesn't support headers.
   */
  @Get('signals')
  async signals(
    @Req() req: any,
    @Res() res: any,
    @Query('commands') commandsStr: string,
    @Query('token') token: string,
  ) {
    if (!this.flags.isEnabled('sse')) {
      res.status(503).send({ error: 'SSE disabled' });
      return;
    }

    // Manual auth via query param token (EventSource can't send headers)
    if (!token) {
      res.status(401).send({ error: 'Token required' });
      return;
    }

    // Validate token
    const cached = await this.redis.getSession(token);
    let userIdNum: number;
    if (cached) {
      const userId = cached.authTelegram?.id || cached.authUser?.telegramId || cached.authUser?.id;
      userIdNum = Number(userId);
    } else {
      const tokenDoc = await this.tokenModel.findOne({ session_id: token, revoked: false }).exec();
      if (!tokenDoc) {
        res.status(401).send({ error: 'Invalid token' });
        return;
      }
      userIdNum = Number(tokenDoc.sub);
    }

    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      res.status(401).send({ error: 'Invalid user' });
      return;
    }

    const userId = String(userIdNum);
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
