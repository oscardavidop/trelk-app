import {
  Controller, Get, Post, Query, Param, Body, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommandReliabilityService } from './command-reliability.service';

@Controller('api/v1/ui/command-reliability')
@UseGuards(BearerAuthGuard)
export class CommandReliabilityController {
  constructor(private readonly svc: CommandReliabilityService) {}

  /** GET /:command — reliability score for a command */
  @Get(':command')
  async getScore(
    @Param('command') command: string,
    @Query('period') period?: '1h' | '24h' | '7d',
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const validPeriod = ['1h', '24h', '7d'].includes(period!) ? period! : '24h';
    const score = await this.svc.getScore(command, validPeriod as '1h' | '24h' | '7d');
    return { ok: true, ...score };
  }

  /** GET /:command/timeline — time-series data for graphs */
  @Get(':command/timeline')
  async getTimeline(
    @Param('command') command: string,
    @Query('hours') hoursStr?: string,
    @Query('buckets') bucketsStr?: string,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const hours = Math.min(Math.max(parseInt(hoursStr!) || 24, 1), 168); // max 7 days
    const buckets = Math.min(Math.max(parseInt(bucketsStr!) || 24, 6), 168);
    const timeline = await this.svc.getTimeline(command, hours, buckets);
    return { ok: true, points: timeline };
  }

  /** GET /alerts — commands with low reliability */
  @Get('meta/alerts')
  async getAlerts(@Query('threshold') thresholdStr?: string) {
    const threshold = Math.min(Math.max(parseInt(thresholdStr!) || 95, 50), 100);
    const alerts = await this.svc.getAlerts(threshold);
    return { ok: true, alerts };
  }

  /** POST /track — record command execution events */
  @Post('track')
  async track(
    @Body() body: {
      command: string;
      success: boolean;
      responseTimeMs: number;
      errorType?: string;
    },
    @Req() req: any,
  ) {
    if (!body.command?.trim()) throw new BadRequestException('command required');
    if (typeof body.success !== 'boolean') throw new BadRequestException('success required');
    if (typeof body.responseTimeMs !== 'number' || body.responseTimeMs < 0) {
      throw new BadRequestException('responseTimeMs must be a non-negative number');
    }
    await this.svc.track(body.command, this.uid(req), body.success, body.responseTimeMs, body.errorType);
    return { ok: true };
  }

  /** POST /track/batch — record multiple execution events */
  @Post('track/batch')
  async trackBatch(
    @Body() body: {
      events: Array<{
        command: string;
        success: boolean;
        responseTimeMs: number;
        errorType?: string;
        timestamp?: number;
      }>;
    },
    @Req() req: any,
  ) {
    if (!Array.isArray(body.events) || body.events.length === 0) {
      throw new BadRequestException('events array required');
    }
    if (body.events.length > 100) throw new BadRequestException('Max 100 events per batch');

    const userId = this.uid(req);
    const events = body.events.map((e) => ({ ...e, userId }));
    const result = await this.svc.trackBatch(events);
    return { ok: true, ...result };
  }

  private uid(req: any): number {
    return req.user?.id ?? req.user?.userId;
  }
}
