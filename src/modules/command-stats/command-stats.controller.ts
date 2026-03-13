import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommandStatsService } from './command-stats.service';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class CommandStatsController {
  constructor(private readonly svc: CommandStatsService) {}

  /** GET /rankings — trending/popular rankings (cached) */
  @Get('rankings')
  async rankings(
    @Query('limit') limitStr: string,
    @Query('trendingLimit') trendingLimitStr: string,
    @Query('popularLimit') popularLimitStr: string,
  ) {
    const limit = parseInt(limitStr, 10);
    const trendingLimit = Math.min(Math.max(parseInt(trendingLimitStr, 10) || limit || 6, 1), 30);
    const popularLimit = Math.min(Math.max(parseInt(popularLimitStr, 10) || limit || 6, 1), 30);
    return { ok: true, ...(await this.svc.getRankings(trendingLimit, popularLimit)) };
  }

  /** GET /:command/stats — aggregated stats (cached 120s) */
  @Get(':command/stats')
  async stats(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getStats(command)) };
  }

  /** GET /:command/my-rating — user's own rating */
  @Get(':command/my-rating')
  async myRating(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getMyRating(this.uid(req), command)) };
  }

  /** POST /:command/rate — submit or update rating */
  @Post(':command/rate')
  async rate(
    @Param('command') command: string,
    @Body() body: { rating: number; review?: string },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (body.rating == null) throw new BadRequestException('rating required');
    await this.svc.rate(this.uid(req), command, body.rating, body.review);
    return { ok: true };
  }

  /** POST /:command/feedback — submit useful/not-useful feedback */
  @Post(':command/feedback')
  async feedback(
    @Param('command') command: string,
    @Body() body: { useful: boolean; reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (typeof body?.useful !== 'boolean') throw new BadRequestException('useful boolean required');
    await this.svc.submitFeedback(this.uid(req), command, body.useful, body.reason);
    return { ok: true };
  }

  /** GET /:command/reviews — recent reviews with text */
  @Get(':command/reviews')
  async reviews(
    @Param('command') command: string,
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.svc.getReviews(command, limit, offset)) };
  }

  /** POST /:command/report — submit error report */
  @Post(':command/report')
  async report(
    @Param('command') command: string,
    @Body() body: { category: string; message: string },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (!body.category?.trim()) throw new BadRequestException('category required');
    if (!body.message?.trim()) throw new BadRequestException('message required');

    const ip = (req.ip || req.headers?.['x-forwarded-for'] || '') as string;
    await this.svc.submitReport(this.uid(req), command, body.category, body.message, ip);
    return { ok: true };
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
