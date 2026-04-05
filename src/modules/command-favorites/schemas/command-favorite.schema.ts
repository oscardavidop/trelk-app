import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommandFavoriteDocument = CommandFavorite & Document;

@Schema({ versionKey: false, collection: 'command_favorites' })
export class CommandFavorite {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true })
  command: string;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ required: true })
  createdAt: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  pendingDeleteAt: number;

  @Prop()
  deleteJobId: string;
}

export const CommandFavoriteSchema = SchemaFactory.createForClass(CommandFavorite);

// Unique compound: one user can favorite a command only once
CommandFavoriteSchema.index({ userId: 1, command: 1 }, { unique: true });
// Fast lookups sorted by time
CommandFavoriteSchema.index({ userId: 1, createdAt: -1 });
CommandFavoriteSchema.index({ command: 1 });
// pending_delete cleanup
CommandFavoriteSchema.index({ status: 1, pendingDeleteAt: 1 });
