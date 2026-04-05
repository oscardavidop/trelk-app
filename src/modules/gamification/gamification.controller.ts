import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GamificationService } from './gamification.service';

@Controller('api/v1/ui/gamification')
@UseGuards(BearerAuthGuard)
export class GamificationController {
  constructor(private readonly svc: GamificationService) {}

  /** GET /api/v1/ui/gamification — Full profile (cached 60s) */
  @Get()
  async profile(@Req() req: any) {
    return this.svc.getProfile(this.uid(req));
  }

  /** GET /api/v1/ui/gamification/achievements?filter=all|unlocked|pending */
  @Get('achievements')
  async achievements(
    @Query('filter') filter: string,
    @Req() req: any,
  ) {
    return this.svc.getAchievements(this.uid(req), filter || 'all');
  }

  /** GET /api/v1/ui/gamification/rankings?limit=10 */
  @Get('rankings')
  async rankings(@Query('limit') limitStr: string) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 50);
    return this.svc.getRankings(limit);
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
