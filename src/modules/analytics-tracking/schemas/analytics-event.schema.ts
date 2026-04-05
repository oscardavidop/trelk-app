import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true, collection: 'analytics_events' })
export class AnalyticsEvent {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, index: true })
  event: string; // page_view, search, command_click, pin_verify, deep_link, etc.

  @Prop({ type: Object, default: {} })
  properties: Record<string, any>;

  @Prop({ index: true })
  sessionId: string;

  @Prop({ type: Number, default: () => Date.now(), index: true })
  timestamp: number;

  @Prop()
  platform: string; // ios, android, web

  @Prop()
  source: string; // deep_link, organic, notification
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// TTL index: auto-delete events older than 90 days
AnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Compound for queries
AnalyticsEventSchema.index({ userId: 1, event: 1, timestamp: -1 });
