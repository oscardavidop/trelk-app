import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsEvent, AnalyticsEventSchema } from './schemas/analytics-event.schema';
import { AnalyticsTrackingService } from './analytics-tracking.service';
import { AnalyticsTrackingController } from './analytics-tracking.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [AnalyticsTrackingController],
  providers: [AnalyticsTrackingService],
  exports: [AnalyticsTrackingService],
})
export class AnalyticsTrackingModule {}
