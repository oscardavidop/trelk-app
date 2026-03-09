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

  @Prop({ required: true, index: true })
  createdAt: number;

  @Prop({ required: true, default: 'open', enum: ['open', 'reviewed', 'closed'] })
  status: string;

  @Prop()
  ipHash?: string;
}

export const CommandReportSchema = SchemaFactory.createForClass(CommandReport);

CommandReportSchema.index({ createdAt: -1 });
CommandReportSchema.index({ userId: 1 });
