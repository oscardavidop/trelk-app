import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException, RawBodyRequest, Headers,
} from '@nestjs/common';
import { CookieAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommandStatsService } from './command-stats.service';
import { ReviewModerationService } from './services/review-moderation.service';

@Controller('api/v1/ui/commands')
@UseGuards(CookieAuthGuard)
export class CommandStatsController {
  constructor(
    private readonly svc: CommandStatsService,
    private readonly moderation: ReviewModerationService,
  ) {}

  /** GET /my-reports — user's own reports */
  @Get('my-reports')
  async myReports(
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Req() req: any,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    return { ok: true, ...(await this.svc.getUserReports(this.uid(req), limit, offset)) };
  }

  /** GET /rankings — trending/popular rankings (cached) */
  @Get('rankings')
  async rankings(
    @Query('limit') limitStr: string,
    @Query('trendingLimit') trendingLimitStr: string,
    @Query('popularLimit') popularLimitStr: string,
  ) {
    const limit = parseInt(limitStr, 10);
    const trendingLimit = Math.min(Math.max(parseInt(trendingLimitStr, 10) || limit || 6, 1), 30);
    const popularLimit = Math.min(Math.max(parseInt(popularLimitStr, 10) || limit || 6, 1), 30);
    return { ok: true, ...(await this.svc.getRankings(trendingLimit, popularLimit)) };
  }

  /** GET /:command/stats — aggregated stats (cached 120s) */
  @Get(':command/stats')
  async stats(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getStats(command)) };
  }

  /** GET /:command/my-rating — user's own rating */
  @Get(':command/my-rating')
  async myRating(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getMyRating(this.uid(req), command)) };
  }

  /** POST /:command/rate — submit or update rating */
  @Post(':command/rate')
  async rate(
    @Param('command') command: string,
    @Body() body: { rating: number; review?: string; context?: { args?: string; resultPreview?: string } },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (body.rating == null) throw new BadRequestException('rating required');
    const result = await this.svc.rate(this.uid(req), command, body.rating, body.review, body.context);
    return { ok: true, ...result };
  }

  /** POST /:command/feedback — submit useful/not-useful feedback */
  @Post(':command/feedback')
  async feedback(
    @Param('command') command: string,
    @Body() body: { useful: boolean; reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' },
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    if (typeof body?.useful !== 'boolean') throw new BadRequestException('useful boolean required');
    await this.svc.submitFeedback(this.uid(req), command, body.useful, body.reason);
    return { ok: true };
  }

  /** GET /:command/reviews/summary — rating distribution */
  @Get(':command/reviews/summary')
  async reviewsSummary(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getReviewsSummary(command)) };
  }

  /** GET /:command/my-review — full review data for current user */
  @Get(':command/my-review')
  async myReview(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const review = await this.svc.getMyReview(this.uid(req), command);
    return { ok: true, review };
  }

  /** GET /:command/reviews — paginated reviews with filters and sort */
  @Get(':command/reviews')
  async reviews(
    @Param('command') command: string,
    @Query('limit') limitStr: string,
    @Query('offset') offsetStr: string,
    @Query('sort') sort: string,
    @Query('rating') ratingStr: string,
    @Query('type') type: string,
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const currentUserId = this.uid(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    const sortVal = sort === 'relevant' ? 'relevant' : 'recent';
    const ratingFilter = parseInt(ratingStr);
    const typeVal = type === 'positive' || type === 'negative' ? type : undefined;
    const result = await this.svc.getReviews(command, limit, offset, sortVal, ratingFilter || undefined, typeVal, currentUserId);

    // Attach helpful info for current user
    const reviewIds = result.items.map((r: any) => r.id);
    const myHelpfuls = reviewIds.length ? await this.svc.getMyHelpfuls(currentUserId, reviewIds) : [];

    // Attach user info (name, photo)
    const userIds = result.items.map((r: any) => r.userId);
    const userInfoMap = userIds.length ? await this.svc.getUserInfoBatch(userIds) : new Map();

    const itemsWithMeta = result.items.map((r: any) => {
      const userInfo = userInfoMap.get(r.userId);
      return {
        ...r,
        myHelpful: myHelpfuls.includes(r.id),
        userName: userInfo ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') : undefined,
        userPhoto: userInfo?.photoUrl,
      };
    });

    return { ok: true, ...result, items: itemsWithMeta };
  }

  /** POST /reviews/:id/reply — submit a reply to a review */
  @Post('reviews/:id/reply')
  async submitReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    if (!body.content?.trim()) throw new BadRequestException('content required');
    const result = await this.svc.submitReply(this.uid(req), id, body.content);
    return { ok: true, ...result };
  }

  /** GET /reviews/:id/replies — get replies for a review */
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
    return { ok: true, ...(await this.svc.getReplies(id, limit, offset, this.uid(req))) };
  }

  /** POST /reviews/replies/:id/delete — admin deletes a reply */
  @Post('reviews/replies/:id/delete')
  async deleteReply(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    await this.svc.deleteReply(this.uid(req), id);
    return { ok: true };
  }

  /** POST /reviews/replies/:id/edit — admin edits a reply */
  @Post('reviews/replies/:id/edit')
  async editReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    if (!body.content?.trim()) throw new BadRequestException('content required');
    await this.svc.editReply(this.uid(req), id, body.content);
    return { ok: true };
  }

  /** POST /reviews/replies/:id/hide — admin toggles reply visibility */
  @Post('reviews/replies/:id/hide')
  async hideReply(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    return { ok: true, ...(await this.svc.hideReply(this.uid(req), id)) };
  }

  /** POST /reviews/replies/:id/helpful — toggle helpful vote on a reply */
  @Post('reviews/replies/:id/helpful')
  async toggleReplyHelpful(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('reply id required');
    return { ok: true, ...(await this.svc.toggleReplyHelpful(this.uid(req), id)) };
  }

  /** GET /:command/reviews/summary-text — AI-generated review summary */
  @Get(':command/reviews/summary-text')
  async reviewsSummaryText(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getReviewSummaryText(command)) };
  }

  /** POST /reviews/:id/helpful — toggle helpful vote */
  @Post('reviews/:id/helpful')
  async toggleHelpful(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    return { ok: true, ...(await this.svc.toggleHelpful(this.uid(req), id)) };
  }

  /** POST /reviews/:id/report — report a review as spam/abuse */
  @Post('reviews/:id/report')
  async reportReview(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.svc.reportReview(this.uid(req), id, body.reason || 'spam');
    return { ok: true };
  }

  /** DELETE /:command/my-review — delete user's own review */
  @Post(':command/delete-review')
  async deleteReview(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    await this.svc.deleteReview(this.uid(req), command);
    return { ok: true };
  }

  /** POST /reviews/:id/admin-delete — admin deletes any review */
  @Post('reviews/:id/admin-delete')
  async adminDeleteReview(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.svc.adminDeleteReview(this.uid(req), id);
    return { ok: true };
  }

  @Get('reviews/:id/status')
  async reviewStatus(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    const status = await this.moderation.getReviewModerationStatus(id);
    return { ok: true, status };
  }

  /** POST /:command/report — submit error report (multipart with optional screenshots) */
  @Post(':command/report')
  async report(
    @Param('command') command: string,
    @Req() req: any,
  ) {
    if (!command?.trim()) throw new BadRequestException('command required');

    // Handle multipart if present, otherwise JSON
    let category: string;
    let message: string;
    let screenshots: string[] = [];
    let honeypot: string | undefined;

    if (req.isMultipart?.() || req.headers['content-type']?.includes('multipart')) {
      const parts = req.parts();
      const fields: Record<string, string> = {};
      const files: Array<{ filename: string; mimetype: string; data: Buffer }> = [];

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          files.push({
            filename: part.filename,
            mimetype: part.mimetype,
            data: Buffer.concat(chunks),
          });
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      category = fields.category || '';
      message = fields.message || '';
      honeypot = fields._hp;

      if (files.length > 0) {
        screenshots = await this.svc.uploadReportScreenshots(files);
      }
    } else {
      const body = req.body || {};
      category = body.category || '';
      message = body.message || '';
      honeypot = body._hp;
    }

    if (!category?.trim()) throw new BadRequestException('category required');
    if (!message?.trim()) throw new BadRequestException('message required');

    // Honeypot anti-bot check
    if (honeypot) throw new BadRequestException('Invalid submission');

    const ip = (req.ip || req.headers?.['x-forwarded-for'] || '') as string;
    const userAgent = req.headers?.['user-agent'] || '';

    await this.svc.submitReport(
      this.uid(req),
      command,
      category,
      message,
      ip,
      screenshots,
      userAgent,
    );
    return { ok: true };
  }

  /** GET /:command/report-stats — report analytics for a command */
  @Get(':command/report-stats')
  async reportStats(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    return { ok: true, ...(await this.svc.getReportStats(command)) };
  }

  /** GET /:command/my-report-status — check if user has reported this command */
  @Get(':command/my-report-status')
  async myReportStatus(@Req() req: any, @Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const userId = this.uid(req);
    const reported = await this.svc.hasUserReported(userId, command);
    return { ok: true, reported };
  }

  // ── Moderation Admin Endpoints ──────────────────────

  /** GET /moderation/pending — list pending reviews (admin) */
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

  /** GET /moderation/rejected — list rejected reviews (admin) */
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

  /** POST /moderation/:id/approve — manually approve a review (admin) */
  @Post('moderation/:id/approve')
  async moderationApprove(@Param('id') id: string, @Req() req: any) {
    await this.requireAdmin(req);
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.moderation.manualApprove(id);
    return { ok: true };
  }

  /** POST /moderation/:id/reject — manually reject a review (admin) */
  @Post('moderation/:id/reject')
  async moderationReject(@Param('id') id: string, @Req() req: any) {
    await this.requireAdmin(req);
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.moderation.manualReject(id);
    return { ok: true };
  }

  /** GET /moderation/metrics — moderation analytics (admin) */
  @Get('moderation/metrics')
  async moderationMetrics(@Req() req: any) {
    await this.requireAdmin(req);
    return { ok: true, ...(await this.moderation.getMetrics()) };
  }

  // ── Webhook ──────────────────────────────────────────

  /** POST /webhooks/moderation — ModerationAPI webhook callback */

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

  /* ── Command Preview (lightweight simulation) ── */
  @Get(':slug/preview')
  async preview(
    @Param('slug') slug: string,
    @Query('input') input: string,
    @Req() req: any,
  ) {
    if (!slug || !input?.trim()) throw new BadRequestException('slug and input are required');
    return { ok: true, ...(await this.svc.getCommandPreview(slug, input.trim())) };
  }

  /* ── Community Signals ── */
  @Get(':slug/signals')
  async signals(
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    if (!slug) throw new BadRequestException('slug is required');
    return { ok: true, ...(await this.svc.getCommandSignals(slug)) };
  }

  /* ── Knowledge Base ── */
  @Get(':slug/knowledge')
  async knowledge(
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    if (!slug) throw new BadRequestException('slug is required');
    return { ok: true, ...(await this.svc.getCommandKnowledge(slug)) };
  }

  /* ── Report Timeline ── */
  @Get('reports/:reportId/timeline')
  async reportTimeline(
    @Param('reportId') reportId: string,
    @Query('limit') limitStr: string,
    @Query('before') beforeStr: string,
    @Req() req: any,
  ) {
    if (!reportId) throw new BadRequestException('reportId is required');
    const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 100);
    const before = parseInt(beforeStr) || undefined;
    const timeline = await this.svc.getReportTimeline(this.uid(req), reportId, limit, before);
    return { ok: true, ...timeline };
  }

  /* ── Single Report Detail ── */
  @Get('reports/:reportId')
  async reportDetail(
    @Param('reportId') reportId: string,
    @Req() req: any,
  ) {
    if (!reportId) throw new BadRequestException('reportId is required');
    const report = await this.svc.getReportDetail(this.uid(req), reportId);
    return { ok: true, report };
  }

  private async requireAdmin(req: any): Promise<void> {
    const userId = this.uid(req);
    const isAdmin = await this.svc.checkIsAdmin(userId);
    if (!isAdmin) throw new BadRequestException('Admin only');
  }

  private uid(req: any): number {
    const u = req.user;
    return u.authTelegram?.id || u.authUser?.telegramId || u.authUser?.id;
  }
}
