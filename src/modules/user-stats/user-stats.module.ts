import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserStatsService } from './user-stats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: History.name, schema: HistorySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [UserStatsService],
  exports: [UserStatsService],
})
export class UserStatsModule {}
