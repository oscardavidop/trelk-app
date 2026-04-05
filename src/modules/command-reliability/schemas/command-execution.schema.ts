import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommandExecutionDocument = CommandExecution & Document;

@Schema({ collection: 'command_executions', timestamps: false })
export class CommandExecution {
  @Prop({ required: true, index: true })
  command: string;

  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, default: () => Date.now(), index: true })
  timestamp: number;

  @Prop({ required: true })
  success: boolean;

  @Prop({ required: true })
  responseTimeMs: number;

  @Prop({ type: String, default: null })
  errorType: string | null;
}

export const CommandExecutionSchema = SchemaFactory.createForClass(CommandExecution);

// Compound indexes for efficient aggregation queries
CommandExecutionSchema.index({ command: 1, timestamp: -1 });
CommandExecutionSchema.index({ command: 1, success: 1, timestamp: -1 });
// TTL: auto-delete after 30 days
CommandExecutionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 86400 });
