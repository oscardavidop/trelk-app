import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';

@Controller('api/v1/ui/history')
@UseGuards(CookieAuthGuard)
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

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
