import {
  Controller, Post, Param, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewHelpfulService } from './review-helpful.service';
import { extractUserId } from '../../common/utils/auth.utils';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class ReviewHelpfulController {
  constructor(private readonly reviewHelpful: ReviewHelpfulService) {}

  @Post('reviews/:id/helpful')
  async toggleHelpful(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    return { ok: true, ...(await this.reviewHelpful.toggleHelpful(extractUserId(req), id)) };
  }
}
