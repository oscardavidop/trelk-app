import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandReport, CommandReportSchema } from './schemas/command-report.schema';
import { ReportEvent, ReportEventSchema } from './schemas/report-event.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { UploadsModule } from '../uploads/uploads.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    UploadsModule,
    ModerationModule,
    MongooseModule.forFeature([
      { name: CommandReport.name, schema: CommandReportSchema },
      { name: ReportEvent.name, schema: ReportEventSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
