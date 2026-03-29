import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { ReviewReply, ReviewReplySchema } from './schemas/review-reply.schema';
import { ReplyHelpful, ReplyHelpfulSchema } from './schemas/reply-helpful.schema';
import { ReviewRepliesService } from './review-replies.service';
import { ReviewRepliesController } from './review-replies.controller';
import { UserStatsModule } from '../user-stats/user-stats.module';

@Module({
  imports: [
    UserStatsModule,
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: ReviewReply.name, schema: ReviewReplySchema },
      { name: ReplyHelpful.name, schema: ReplyHelpfulSchema },
    ]),
  ],
  controllers: [ReviewRepliesController],
  providers: [ReviewRepliesService],
  exports: [ReviewRepliesService],
})
export class ReviewRepliesModule {}
