import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { CommandReport, CommandReportSchema } from '../reports/schemas/command-report.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteSchema } from '../command-favorites/schemas/command-favorite.schema';
import { ReviewSummary, ReviewSummarySchema } from '../review-summary/schemas/review-summary.schema';
import { RatingsModule } from '../ratings/ratings.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: CommandReport.name, schema: CommandReportSchema },
      { name: History.name, schema: HistorySchema },
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
      { name: ReviewSummary.name, schema: ReviewSummarySchema },
    ]),
    RatingsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
