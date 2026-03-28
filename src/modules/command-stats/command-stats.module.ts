import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandRating, CommandRatingSchema } from './schemas/command-rating.schema';
import { CommandReport, CommandReportSchema } from './schemas/command-report.schema';
import { ReviewHelpful, ReviewHelpfulSchema } from './schemas/review-helpful.schema';
import { ReviewReply, ReviewReplySchema } from './schemas/review-reply.schema';
import { ReplyHelpful, ReplyHelpfulSchema } from './schemas/reply-helpful.schema';
import { UserModeration, UserModerationSchema } from './schemas/user-moderation.schema';
import { ReviewSummary, ReviewSummarySchema } from './schemas/review-summary.schema';
import { ReportEvent, ReportEventSchema } from './schemas/report-event.schema';
import { History, HistorySchema } from '../history/schemas/history.schema';
import { CommandFavorite, CommandFavoriteSchema } from '../command-favorites/schemas/command-favorite.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CommandStatsService } from './command-stats.service';
import { CommandStatsController } from './command-stats.controller';
import { ReportUploadService } from './services/report-upload.service';
import { ReviewModerationService } from './services/review-moderation.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: CommandRating.name, schema: CommandRatingSchema },
      { name: CommandReport.name, schema: CommandReportSchema },
      { name: ReviewHelpful.name, schema: ReviewHelpfulSchema },
      { name: ReviewReply.name, schema: ReviewReplySchema },
      { name: ReplyHelpful.name, schema: ReplyHelpfulSchema },
      { name: UserModeration.name, schema: UserModerationSchema },
      { name: History.name, schema: HistorySchema },
      { name: CommandFavorite.name, schema: CommandFavoriteSchema },
      { name: User.name, schema: UserSchema },
      { name: ReviewSummary.name, schema: ReviewSummarySchema },
      { name: ReportEvent.name, schema: ReportEventSchema },
    ]),
  ],
  controllers: [CommandStatsController],
  providers: [
    CommandStatsService,
    ReportUploadService,
    ReviewModerationService,
  ],
  exports: [CommandStatsService, ReviewModerationService],
})
export class CommandStatsModule {}
