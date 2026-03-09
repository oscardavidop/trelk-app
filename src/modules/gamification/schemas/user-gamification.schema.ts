import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class UserAchievement {
  @Prop({ required: true })
  id: string;

  @Prop({ default: 0 })
  progress: number;

  @Prop({ default: false })
  unlocked: boolean;

  @Prop()
  unlockedAt?: string;
}

export const UserAchievementSchema = SchemaFactory.createForClass(UserAchievement);

@Schema({ versionKey: false, collection: 'user_gamification' })
export class UserGamification {
  @Prop({ required: true, unique: true, index: true })
  userId: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 0 })
  streak: number;

  @Prop({ default: '' })
  lastActiveDate: string;

  @Prop({ type: [UserAchievementSchema], default: [] })
  achievements: UserAchievement[];
}

export type UserGamificationDocument = UserGamification & Document;
export const UserGamificationSchema = SchemaFactory.createForClass(UserGamification);

UserGamificationSchema.index({ userId: 1 }, { unique: true });
