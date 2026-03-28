import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SuggestionDocument = Suggestion & Document;

export type SuggestionStatus = 'pending' | 'reviewing' | 'planned' | 'in_progress' | 'done' | 'declined';

@Schema({ versionKey: false, collection: 'suggestions' })
export class Suggestion {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, maxlength: 2000 })
  description: string;

  @Prop({ required: true, default: 'pending', enum: ['pending', 'reviewing', 'planned', 'in_progress', 'done', 'declined'] })
  status: SuggestionStatus;

  @Prop({ default: 0 })
  votesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;

  @Prop()
  githubIssueUrl?: string;

  @Prop()
  adminNote?: string;

  @Prop({ required: true, default: () => Date.now() })
  createdAt: number;

  @Prop({ required: true, default: () => Date.now() })
  updatedAt: number;
}

export const SuggestionSchema = SchemaFactory.createForClass(Suggestion);

SuggestionSchema.index({ createdAt: -1 });
SuggestionSchema.index({ votesCount: -1 });
SuggestionSchema.index({ status: 1 });
SuggestionSchema.index({ userId: 1 });
// Text index for similar suggestion detection
SuggestionSchema.index({ title: 'text', description: 'text' });
