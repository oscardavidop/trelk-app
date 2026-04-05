import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PersonalizationService } from './personalization.service';
import { buildConfidence } from '../../common/types/confidence.types';

function extractUserId(req: any): number {
  const u = req.user;
  return u?.authTelegram?.id || u?.authUser?.telegramId || u?.authUser?.id || 0;
}

@Controller('api/v1/ui/personalization')
@UseGuards(BearerAuthGuard)
export class PersonalizationController {
  constructor(private readonly personalization: PersonalizationService) {}

  /** GET /api/v1/ui/personalization — Full personalized feed */
  @Get()
  async getPersonalized(@Req() req: any) {
    const userId = extractUserId(req);
    const data = await this.personalization.getPersonalized(userId);
    const totalItems = data.forYou.length + data.continueUsing.length + data.basedOnHistory.length + data.discover.length;
    return {
      ok: true,
      ...data,
      confidence: buildConfidence({
        dataPoints: totalItems,
        source: 'computed',
        highThreshold: 20,
        mediumThreshold: 5,
      }),
    };
  }
}
