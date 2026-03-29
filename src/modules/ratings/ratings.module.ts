import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from './schemas/command-rating.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { UserStatsModule } from '../user-stats/user-stats.module';

@Module({
  imports: [
    ModerationModule,
    UserStatsModule,
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: History.name, schema: HistorySchema },
    ]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
