import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SuggestionVoteDocument = SuggestionVote & Document;

@Schema({ versionKey: false, collection: 'suggestion_votes' })
export class SuggestionVote {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  suggestionId: string;

  @Prop({ required: true, default: () => Date.now() })
  createdAt: number;
}

export const SuggestionVoteSchema = SchemaFactory.createForClass(SuggestionVote);

// One vote per user per suggestion
SuggestionVoteSchema.index({ userId: 1, suggestionId: 1 }, { unique: true });
SuggestionVoteSchema.index({ suggestionId: 1 });
