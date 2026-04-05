import {
  Controller, Get, Post, Param, Body, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RatingsService } from './ratings.service';
import { ReviewRateLimit } from '../../common/decorators/rate-limit.decorator';
import { extractUserId } from '../../common/utils/auth.utils';

@Controller('api/v1/ui/commands')
@UseGuards(BearerAuthGuard)
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get(':command/my-rating')
  async myRating(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.ratings.getMyRating(extractUserId(req), command)) };
  }

  @Post(':command/rate')
  @ReviewRateLimit()
  async rate(
    @Param('command') command: string,
    @Body() body: { rating: number; review?: string; context?: { args?: string; resultPreview?: string } },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (body.rating == null) throw new BadRequestException('rating required');
    const result = await this.ratings.rate(extractUserId(req), command, body.rating, body.review, body.context);
    return { ok: true, ...result };
  }

  @Post(':command/feedback')
  async feedback(
    @Param('command') command: string,
    @Body() body: { useful: boolean; reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (typeof body?.useful !== 'boolean') throw new BadRequestException('useful boolean required');
    await this.ratings.submitFeedback(extractUserId(req), command, body.useful, body.reason);
    return { ok: true };
  }
}
