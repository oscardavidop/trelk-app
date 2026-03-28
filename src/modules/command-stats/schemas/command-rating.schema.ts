import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommandRatingDocument = CommandRating & Document;

@Schema({ versionKey: false, collection: 'command_ratings' })
export class CommandRating {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true })
  command: string;

  @Prop({ required: false, min: 1, max: 5 })
  rating: number;

  @Prop()
  review?: string;

  @Prop({ enum: ['useful', 'not_useful'], required: false })
  feedback?: 'useful' | 'not_useful';

  @Prop({ enum: ['didnt_work', 'too_slow', 'bad_results', 'confusing'], required: false })
  reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing';

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: 0 })
  trustScoreSnapshot: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isTrustedUser: boolean;

  @Prop({ default: false })
  isAIModerated: boolean;

  @Prop({ type: String, enum: ['power_user', 'active_user', 'new_user'], default: 'new_user' })
  badge: 'power_user' | 'active_user' | 'new_user';

  @Prop({ default: false })
  isSuspicious: boolean;

  @Prop({ default: 0 })
  spamScore: number;

  @Prop({ type: Object, default: undefined })
  commandContext?: { args?: string; resultPreview?: string };

  @Prop({ default: 0 })
  repliesCount: number;

  // ── Moderation fields ──
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' })
  status: 'pending' | 'approved' | 'rejected';

  @Prop({ type: Number, default: null })
  moderationScore: number | null;

  @Prop({ type: [String], default: [] })
  moderationReasons: string[];

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop({ type: Object, default: null })
  moderationMeta: Record<string, any> | null;

  @Prop({ type: String, default: null })
  moderationRejectionKey: string | null;

  @Prop({ required: true })
  createdAt: number;

  @Prop({ required: true })
  updatedAt: number;
}

export const CommandRatingSchema = SchemaFactory.createForClass(CommandRating);

CommandRatingSchema.index({ userId: 1, command: 1 }, { unique: true });
CommandRatingSchema.index({ command: 1 });
CommandRatingSchema.index({ command: 1, createdAt: -1 });
CommandRatingSchema.index({ command: 1, rating: 1 });
CommandRatingSchema.index({ helpfulCount: -1 });
CommandRatingSchema.index({ command: 1, status: 1, createdAt: -1 });
