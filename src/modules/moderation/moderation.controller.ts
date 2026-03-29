import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException, Headers,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewModerationService } from './review-moderation.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { extractUserId } from '../../common/utils/auth.utils';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class ModerationController {
  constructor(
    private readonly moderation: ReviewModerationService,
    private readonly userStats: UserStatsService,
  ) {}

  @Get('moderation/pending')
  async moderationPending(
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    await this.requireAdmin(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.moderation.getPendingReviews(limit, offset)) };
  }

  @Get('moderation/rejected')
  async moderationRejected(
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    await this.requireAdmin(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.moderation.getRejectedReviews(limit, offset)) };
  }

  @Post('moderation/:id/approve')
  async moderationApprove(@Param('id') id: string, @Req() req: any) {
    await this.requireAdmin(req);
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.moderation.manualApprove(id);
    return { ok: true };
  }

  @Post('moderation/:id/reject')
  async moderationReject(@Param('id') id: string, @Req() req: any) {
    await this.requireAdmin(req);
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.moderation.manualReject(id);
    return { ok: true };
  }

  @Get('moderation/metrics')
  async moderationMetrics(@Req() req: any) {
    await this.requireAdmin(req);
    return { ok: true, ...(await this.moderation.getMetrics()) };
  }

  @Post('webhooks/moderation')
  async moderationWebhook(
    @Body() body: any,
    @Headers('x-modapi-signature') signature: string,
  ) {
    if (signature && !this.moderation.verifyWebhookSignature(JSON.stringify(body), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const reviewId = body?.content_id || body?.contentId;
    if (!reviewId) throw new BadRequestException('Missing content id');

    const evaluation = body?.evaluation || {};
    const recommendation = body?.recommendation || {};
    const policies = body?.policies || [];

    const result = {
      status: (recommendation.action === 'reject' ? 'rejected' : 'approved') as 'approved' | 'rejected',
      moderationScore: evaluation.severity_score ?? evaluation.flag_probability ?? 0,
      moderationReasons: recommendation.reason_codes || [],
      isFlagged: evaluation.flagged ?? false,
      policies: (policies as any[]).reduce((acc: Record<string, any>, p: any) => {
        acc[p.id || p.name] = { probability: p.probability, flagged: p.flagged };
        return acc;
      }, {}),
    };

    await this.moderation.applyModerationResult(reviewId, result);
    return { ok: true };
  }

  @Get('reviews/:id/status')
  async reviewStatus(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    const status = await this.moderation.getReviewModerationStatus(id);
    return { ok: true, status };
  }

  private async requireAdmin(req: any): Promise<void> {
    const userId = extractUserId(req);
    const isAdmin = this.userStats.checkIsAdmin(userId);
    if (!isAdmin) throw new BadRequestException('Admin only');
  }
}
