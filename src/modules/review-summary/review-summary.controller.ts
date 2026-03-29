import {
  Controller, Get, Param, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewSummaryService } from './review-summary.service';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class ReviewSummaryController {
  constructor(private readonly reviewSummary: ReviewSummaryService) {}

  @Get(':command/reviews/summary-text')
  async reviewsSummaryText(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.reviewSummary.getReviewSummaryText(command)) };
  }
}
