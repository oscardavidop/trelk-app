import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommandReportDocument = CommandReport & Document;

@Schema({ versionKey: false, collection: 'command_reports' })
export class CommandReport {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, index: true })
  command: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: ['bug', 'wrong_result', 'crash', 'other'] })
  category: string;

  @Prop({ type: [String], default: [] })
  screenshots: string[];

  @Prop({ required: true, index: true })
  createdAt: number;

  @Prop({ required: true, default: 'open', enum: ['open', 'reviewed', 'closed'] })
  status: string;

  @Prop()
  ipHash?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  githubIssueUrl?: string;

  @Prop()
  githubIssueNumber?: number;

  @Prop()
  githubRepo?: string;

  @Prop({ type: String, default: null })
  githubState?: 'open' | 'closed' | null;

  @Prop({ type: [String], default: [] })
  githubLabels: string[];

  @Prop({ type: [String], default: [] })
  githubAssignees: string[];

  @Prop()
  sentryEventId?: string;
}

export const CommandReportSchema = SchemaFactory.createForClass(CommandReport);

CommandReportSchema.index({ createdAt: -1 });
CommandReportSchema.index({ userId: 1 });
CommandReportSchema.index({ command: 1, category: 1 });
CommandReportSchema.index({ githubIssueNumber: 1 });
