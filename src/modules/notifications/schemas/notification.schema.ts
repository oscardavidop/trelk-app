import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationPriority = 'low' | 'normal' | 'high';

export type NotificationType =
  | 'achievement_unlocked'
  | 'review_rejected'
  | 'review_approved'
  | 'new_command'
  | 'weekly_stats'
  | 'system_alert'
  | 'command_trending'
  | 'user_level_up'
  | 'report_resolved'
  | 'report_comment'
  | 'report_assigned'
  | 'report_reopened'
  | 'report_labeled'
  | 'ai_summary_updated'
  | 'inactivity_reminder';

@Schema({ timestamps: false, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  titleKey: string;

  @Prop({ required: true })
  messageKey: string;

  @Prop({ type: Object })
  titleParams?: Record<string, unknown>;

  @Prop({ type: Object })
  messageParams?: Record<string, unknown>;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ default: false })
  read: boolean;

  @Prop({ required: true })
  createdAt: number;

  @Prop()
  readAt?: number;

  @Prop({ default: 'normal' })
  priority: NotificationPriority;

  @Prop()
  groupId?: string;

  @Prop()
  link?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, groupId: 1 });
