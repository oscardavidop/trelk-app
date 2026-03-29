import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewSummaryDocument = ReviewSummary & Document;

@Schema({ versionKey: false, collection: 'command_review_summaries' })
export class ReviewSummary {
  @Prop({ required: true, unique: true, index: true })
  commandSlug: string;

  @Prop({ default: '' })
  summary: string;

  @Prop({ type: [String], default: [] })
  pros: string[];

  @Prop({ type: [String], default: [] })
  cons: string[];

  @Prop({ type: [String], default: [] })
  highlights: string[];

  @Prop({ type: [String], default: [] })
  highlightSourceReviewIds: string[];

  @Prop({ enum: ['positive', 'neutral', 'negative'], default: 'neutral' })
  sentiment: string;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'low' })
  confidenceLevel: string;

  @Prop({ default: 0 })
  confidenceScore: number;

  @Prop({ enum: ['positive', 'neutral', 'negative', 'none'], default: 'none' })
  trend: string;

  @Prop({ default: '' })
  trendMessage: string;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: '' })
  aiEngine: string;

  @Prop({ default: 0 })
  generationTimeMs: number;

  @Prop()
  updatedAt: number;

  @Prop()
  createdAt: number;
}

export const ReviewSummarySchema = SchemaFactory.createForClass(ReviewSummary);

// Indexes for efficient lookup
ReviewSummarySchema.index({ commandSlug: 1, updatedAt: -1 });
ReviewSummarySchema.index({ sentiment: 1 });
