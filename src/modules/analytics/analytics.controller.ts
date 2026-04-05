import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommandRateLimit } from '../../common/decorators/rate-limit.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('api/v1/ui/commands')
@UseGuards(BearerAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('rankings')
  @CommandRateLimit()
  async getRankings(
    @Query('trending') trending?: string,
    @Query('popular') popular?: string,
  ) {
    const t = trending ? parseInt(trending, 10) : 6;
    const p = popular ? parseInt(popular, 10) : 6;
    return this.analytics.getRankings(t, p);
  }

  @Get(':command/stats')
  @CommandRateLimit()
  async getStats(@Param('command') command: string) {
    return this.analytics.getStats(command);
  }

  @Get(':slug/preview')
  async getPreview(
    @Param('slug') slug: string,
    @Query('input') input: string,
  ) {
    if (!input) return { result: null, cached: false };
    return this.analytics.getCommandPreview(slug, input);
  }

  @Get(':slug/signals')
  @CommandRateLimit()
  async getSignals(@Param('slug') slug: string) {
    return this.analytics.getCommandSignals(slug);
  }

  @Get(':slug/knowledge')
  @CommandRateLimit()
  async getKnowledge(@Param('slug') slug: string) {
    return this.analytics.getCommandKnowledge(slug);
  }
}
