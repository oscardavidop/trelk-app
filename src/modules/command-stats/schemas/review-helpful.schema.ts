import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewHelpfulDocument = ReviewHelpful & Document;

@Schema({ versionKey: false, collection: 'review_helpfuls' })
export class ReviewHelpful {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'CommandRating', index: true })
  reviewId: Types.ObjectId;

  @Prop({ required: true })
  createdAt: number;
}

export const ReviewHelpfulSchema = SchemaFactory.createForClass(ReviewHelpful);
ReviewHelpfulSchema.index({ userId: 1, reviewId: 1 }, { unique: true });
