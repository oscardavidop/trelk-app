import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SuggestionCommentDocument = SuggestionComment & Document;

@Schema({ versionKey: false, collection: 'suggestion_comments' })
export class SuggestionComment {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true, index: true })
  suggestionId: string;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ required: true, default: () => Date.now() })
  createdAt: number;
}

export const SuggestionCommentSchema = SchemaFactory.createForClass(SuggestionComment);

SuggestionCommentSchema.index({ suggestionId: 1, createdAt: -1 });
