import { Module } from '@nestjs/common';
// import { UploadsModule } from '../uploads/uploads.module';
import { UserStatsModule } from '../user-stats/user-stats.module';
import { ModerationModule } from '../moderation/moderation.module';
import { RatingsModule } from '../ratings/ratings.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ReviewHelpfulModule } from '../review-helpful/review-helpful.module';
import { ReviewRepliesModule } from '../review-replies/review-replies.module';
import { ReportsModule } from '../reports/reports.module';
import { ReviewSummaryModule } from '../review-summary/review-summary.module';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * Barrel module — re-exports all command-stats sub-modules.
 * No business logic lives here.
 */
@Module({
  imports: [
    // UploadModule,
    UserStatsModule,
    ModerationModule,
    RatingsModule,
    ReviewsModule,
    ReviewHelpfulModule,
    ReviewRepliesModule,
    ReportsModule,
    ReviewSummaryModule,
    AnalyticsModule,
  ],
  exports: [
    // UploadsModule,
    UserStatsModule,
    ModerationModule,
    RatingsModule,
    ReviewsModule,
    ReviewHelpfulModule,
    ReviewRepliesModule,
    ReportsModule,
    ReviewSummaryModule,
    AnalyticsModule,
  ],
})
export class CommandStatsModule {}
