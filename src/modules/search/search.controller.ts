import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

function extractUserId(req: any): number {
  const u = req.user;
  return u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id || 0;
}

@Controller('api/v1/ui/search')
@UseGuards(BearerAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** GET /api/v1/ui/search?q=play — Search commands */
  @Get()
  @RateLimit({ limit: 30, window: 60, keyType: 'user' })
  async query(@Query('q') q: string, @Req() req: any) {
    const userId = extractUserId(req);
    const sanitized = (q || '').trim().slice(0, 100);
    if (sanitized) {
      await this.search.saveRecentSearch(userId, sanitized);
    }
    const data = await this.search.search(sanitized, userId);
    return { ok: true, ...data };
  }

  /** GET /api/v1/ui/search/trending — Trending searches */
  @Get('trending')
  async trending() {
    const trending = await this.search.getTrending();
    return { ok: true, trending };
  }

  /** GET /api/v1/ui/search/recent — User's recent searches */
  @Get('recent')
  async recent(@Req() req: any) {
    const userId = extractUserId(req);
    const recent = await this.search.getRecentSearches(userId);
    return { ok: true, recent };
  }
}
