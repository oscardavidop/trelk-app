import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommandRatingDocument = CommandRating & Document;

@Schema({ versionKey: false, collection: 'command_ratings' })
export class CommandRating {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true })
  command: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  review?: string;

  @Prop({ required: true })
  createdAt: number;

  @Prop({ required: true })
  updatedAt: number;
}

export const CommandRatingSchema = SchemaFactory.createForClass(CommandRating);

CommandRatingSchema.index({ userId: 1, command: 1 }, { unique: true });
CommandRatingSchema.index({ command: 1 });
