import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';

@Controller('api/v1/ui/recommendations')
@UseGuards(BearerAuthGuard)
export class RecommendationsController {
  constructor(private readonly svc: RecommendationsService) {}

  @Get()
  async getRecommendations(
    @Req() req: any,
    @Query('limit') limitStr?: string,
  ) {
    const userId = req.user.id || req.user.telegramId;
    const limit = Math.min(Math.max(parseInt(limitStr || '10', 10) || 10, 1), 30);
    const data = await this.svc.getRecommendations(userId, limit);
    return { ok: true, data };
  }
}
