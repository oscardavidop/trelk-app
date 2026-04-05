import { Controller, Get, Post, Delete, Query, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { WriteRateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('api/v1/ui/history')
@UseGuards(BearerAuthGuard)
export class HistoryController {
  constructor(private readonly svc: HistoryService) {}

  /**
   * GET /api/v1/ui/history?limit=20&offset=0
   * Paginated user history, ordered by timestamp desc.
   */
  @Get()
  async list(
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    const userId = this.uid(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);

    return this.svc.findPaginated(userId, offset, limit);
  }

  /**
   * GET /api/v1/ui/history/stats
   * Activity summary for the authenticated user (cached 30s).
   */
  @Get('stats')
  async stats(@Req() req: any) {
    return this.svc.getStats(this.uid(req));
  }

  /**
   * GET /api/v1/ui/history/global
   * Global command stats across all users (cached 60s).
   */
  @Get('global')
  async globalStats() {
    return this.svc.getGlobalStats();
  }

  /**
   * GET /api/v1/ui/history/weekly-recap
   * Weekly activity recap for the authenticated user.
   */
  @Get('weekly-recap')
  async weeklyRecap(@Req() req: any) {
    const data = await this.svc.getWeeklyRecap(this.uid(req));
    return { ok: true, data };
  }

  /**
   * DELETE /api/v1/ui/history
   * Mark entries as pending_delete (with undo window), or hard delete in persistent mode.
   * Body: { ids: string[] } for specific, omit for all.
   */
  @Delete()
  @WriteRateLimit()
  async hide(@Body() body: { ids?: string[] }, @Req() req: any) {
    const userId = this.uid(req);
    if (body?.ids?.length) {
      const result = await this.svc.hideEntries(userId, body.ids);
      return { ok: true, ...result };
    }
    const result = await this.svc.hideAll(userId);
    return { ok: true, ...result };
  }

  /**
   * POST /api/v1/ui/history/undo
   * Undo pending_delete for specific entries or by jobId.
   * Body: { ids?: string[], jobId?: string }
   */
  @Post('undo')
  async undo(@Body() body: { ids?: string[]; jobId?: string }, @Req() req: any) {
    const userId = this.uid(req);
    if (body?.ids?.length) {
      const result = await this.svc.undoEntries(userId, body.ids);
      return { ok: true, ...result };
    }
    if (body?.jobId) {
      const result = await this.svc.undoAll(userId, body.jobId);
      return { ok: true, ...result };
    }
    throw new BadRequestException('ids or jobId required');
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
