import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewSummary, ReviewSummarySchema } from './schemas/review-summary.schema';
import { ReviewSummaryService } from './review-summary.service';
import { ReviewSummaryController } from './review-summary.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    ModerationModule,
    MongooseModule.forFeature([
      { name: ReviewSummary.name, schema: ReviewSummarySchema },
    ]),
  ],
  controllers: [ReviewSummaryController],
  providers: [ReviewSummaryService],
  exports: [ReviewSummaryService],
})
export class ReviewSummaryModule {}
