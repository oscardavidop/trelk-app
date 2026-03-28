import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GithubWebhookController } from './github-webhook.controller';
import { GithubWebhookService } from './github-webhook.service';
import { CommandReport, CommandReportSchema } from '../command-stats/schemas/command-report.schema';
import { ReportEvent, ReportEventSchema } from '../command-stats/schemas/report-event.schema';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: CommandReport.name, schema: CommandReportSchema },
      { name: ReportEvent.name, schema: ReportEventSchema },
    ]),
  ],
  controllers: [GithubWebhookController],
  providers: [GithubWebhookService],
})
export class GithubWebhookModule {}
