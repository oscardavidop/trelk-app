import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoryDocument = History & Document;

@Schema({ versionKey: false })
export class History {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, enum: ['command', 'favorite_added', 'achievement', 'inline_query'] })
  type: string;

  @Prop()
  command?: string;

  @Prop()
  args?: string;

  @Prop()
  item?: string;

  @Prop()
  achievementName?: string;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true })
  date: string;
}

export const HistorySchema = SchemaFactory.createForClass(History);

// Optimized indexes (same as trelk bot)
HistorySchema.index({ userId: 1, timestamp: -1 });
HistorySchema.index({ command: 1 });
HistorySchema.index({ type: 1 });
HistorySchema.index({ timestamp: -1 });
