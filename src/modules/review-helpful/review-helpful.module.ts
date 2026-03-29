import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { ReviewHelpful, ReviewHelpfulSchema } from './schemas/review-helpful.schema';
import { ReviewHelpfulService } from './review-helpful.service';
import { ReviewHelpfulController } from './review-helpful.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: ReviewHelpful.name, schema: ReviewHelpfulSchema },
    ]),
  ],
  controllers: [ReviewHelpfulController],
  providers: [ReviewHelpfulService],
  exports: [ReviewHelpfulService],
})
export class ReviewHelpfulModule {}
