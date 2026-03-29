import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserModerationDocument = UserModeration & Document;

@Schema({ versionKey: false, collection: 'user_moderations' })
export class UserModeration {
  @Prop({ required: true, unique: true, index: true })
  userId: number;

  @Prop({ default: 0 })
  rejectedCount: number;

  @Prop({ default: 0 })
  flaggedCount: number;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ type: Number, default: null })
  blockedUntil: number | null;

  @Prop({ default: Date.now })
  createdAt: number;

  @Prop({ default: Date.now })
  updatedAt: number;
}

export const UserModerationSchema = SchemaFactory.createForClass(UserModeration);
