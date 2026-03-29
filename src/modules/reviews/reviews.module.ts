import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { ReviewHelpful, ReviewHelpfulSchema } from '../review-helpful/schemas/review-helpful.schema';
import { ReviewReply, ReviewReplySchema } from '../review-replies/schemas/review-reply.schema';
import { ReviewSummary, ReviewSummarySchema } from '../review-summary/schemas/review-summary.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { UserStatsModule } from '../user-stats/user-stats.module';
import { ReviewHelpfulModule } from '../review-helpful/review-helpful.module';

@Module({
  imports: [
    ModerationModule,
    UserStatsModule,
    ReviewHelpfulModule,
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: ReviewHelpful.name, schema: ReviewHelpfulSchema },
      { name: ReviewReply.name, schema: ReviewReplySchema },
      { name: ReviewSummary.name, schema: ReviewSummarySchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
