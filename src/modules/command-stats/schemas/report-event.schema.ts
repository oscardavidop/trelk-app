import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportEventDocument = ReportEvent & Document;

export type ReportEventType = 'issue' | 'comment';
export type ReportEventAction =
  | 'opened'
  | 'closed'
  | 'reopened'
  | 'edited'
  | 'assigned'
  | 'unassigned'
  | 'labeled'
  | 'unlabeled'
  | 'commented'
  | 'comment_edited'
  | 'comment_deleted';

@Schema({ versionKey: false, collection: 'report_events' })
export class ReportEvent {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  reportId: Types.ObjectId;

  @Prop({ required: true })
  githubIssueNumber: number;

  @Prop({ required: true, enum: ['issue', 'comment'] })
  type: ReportEventType;

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object, required: true })
  actor: { username: string; avatarUrl: string };

  @Prop()
  content?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ required: true })
  createdAt: number;
}

export const ReportEventSchema = SchemaFactory.createForClass(ReportEvent);

ReportEventSchema.index({ reportId: 1, createdAt: -1 });
ReportEventSchema.index({ githubIssueNumber: 1 });
