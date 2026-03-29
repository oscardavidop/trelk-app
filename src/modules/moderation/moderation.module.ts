import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from '../ratings/schemas/command-rating.schema';
import { UserModeration, UserModerationSchema } from './schemas/user-moderation.schema';
import { ReviewModerationService } from './review-moderation.service';
import { ModerationController } from './moderation.controller';
import { NotificationModule } from '../notifications/notification.module';
import { UserStatsModule } from '../user-stats/user-stats.module';

@Module({
  imports: [
    NotificationModule,
    UserStatsModule,
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: UserModeration.name, schema: UserModerationSchema },
    ]),
  ],
  controllers: [ModerationController],
  providers: [ReviewModerationService],
  exports: [ReviewModerationService],
})
export class ModerationModule {}
