import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { BearerAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { ReviewHelpfulService } from '../review-helpful/review-helpful.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { extractUserId } from '../../common/utils/auth.utils';
import { buildConfidence } from '../../common/types/confidence.types';

@Controller('api/v1/ui/commands')
@UseGuards(BearerAuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsSvc: ReviewsService,
    private readonly reviewHelpful: ReviewHelpfulService,
    private readonly userStats: UserStatsService,
  ) {}

  @Get(':command/reviews/summary')
  async reviewsSummary(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const summary = await this.reviewsSvc.getReviewsSummary(command);
    return {
      ok: true,
      ...summary,
      confidence: buildConfidence({
        dataPoints: summary.totalReviews,
        source: 'live',
        highThreshold: 50,
        mediumThreshold: 10,
      }),
    };
  }

  @Get(':command/reviews/highlights')
  async reviewHighlights(@Param('command') command: string) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const highlights = await this.reviewsSvc.getReviewHighlights(command);
    return { ok: true, highlights };
  }

  @Get(':command/my-review')
  async myReview(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    const review = await this.reviewsSvc.getMyReview(extractUserId(req), command);
    return { ok: true, review };
  }

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
    const currentUserId = extractUserId(req);
    const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 30);
    const offset = Math.max(parseInt(offsetStr) || 0, 0);
    const sortVal = sort === 'relevant' ? 'relevant' : 'recent';
    const ratingFilter = parseInt(ratingStr);
    const typeVal = type === 'positive' || type === 'negative' ? type : undefined;
    const result = await this.reviewsSvc.getReviews(command, limit, offset, sortVal, ratingFilter || undefined, typeVal, currentUserId);

    const reviewIds = result.items.map((r: any) => r.id);
    const myHelpfuls = reviewIds.length ? await this.reviewHelpful.getMyHelpfuls(currentUserId, reviewIds) : [];

    const userIds = result.items.map((r: any) => r.userId);
    const userInfoMap = userIds.length ? await this.userStats.getUserInfoBatch(userIds) : new Map();

    const itemsWithMeta = result.items.map((r: any) => {
      const userInfo = userInfoMap.get(r.userId);
      return {
        ...r,
        myHelpful: myHelpfuls.includes(r.id),
        userName: userInfo ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') : undefined,
        userPhoto: userInfo?.photoUrl,
        username: userInfo?.username || undefined,
        isAdmin: this.userStats.checkIsAdmin(r.userId),
      };
    });

    return {
      ok: true,
      ...result,
      items: itemsWithMeta,
      confidence: buildConfidence({
        dataPoints: result.total,
        source: 'live',
      }),
    };
  }

  @Post(':command/delete-review')
  async deleteReview(@Param('command') command: string, @Req() req: any) {
    if (!command?.trim()) throw new BadRequestException('command required');
    await this.reviewsSvc.deleteReview(extractUserId(req), command);
    return { ok: true };
  }

  @Post('reviews/:id/admin-delete')
  async adminDeleteReview(@Param('id') id: string, @Req() req: any) {
    if (!id?.trim()) throw new BadRequestException('review id required');
    await this.reviewsSvc.adminDeleteReview(extractUserId(req), id);
    return { ok: true };
  }

}
