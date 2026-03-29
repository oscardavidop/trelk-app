import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewRepliesService } from './review-replies.service';
import { WriteRateLimit } from '../../common/decorators/rate-limit.decorator';
import { extractUserId } from '../../common/utils/auth.utils';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class ReviewRepliesController {
  constructor(private readonly replies: ReviewRepliesService) {}

  @Post('reviews/:id/reply')
  @WriteRateLimit()
  async submitReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    if (!body.content?.trim()) throw new BadRequestException('content required');
    const result = await this.replies.submitReply(extractUserId(req), id, body.content);
    return { ok: true, ...result };
  }

  @Get('reviews/:id/replies')
  async getReplies(
    @Param('id') id: string,
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 50);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.replies.getReplies(id, limit, offset, extractUserId(req))) };
  }

  @Post('reviews/replies/:id/delete')
  async deleteReply(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    await this.replies.deleteReply(extractUserId(req), id);
    return { ok: true };
  }

  @Post('reviews/replies/:id/edit')
  async editReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    if (!body.content?.trim()) throw new BadRequestException('content required');
    await this.replies.editReply(extractUserId(req), id, body.content);
    return { ok: true };
  }

  @Post('reviews/replies/:id/hide')
  async hideReply(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    return { ok: true, ...(await this.replies.hideReply(extractUserId(req), id)) };
  }

  @Post('reviews/replies/:id/helpful')
  async toggleReplyHelpful(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    return { ok: true, ...(await this.replies.toggleReplyHelpful(extractUserId(req), id)) };
  }
}
