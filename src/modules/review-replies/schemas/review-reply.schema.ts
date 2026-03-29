import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewReplyDocument = ReviewReply & Document;

@Schema({ versionKey: false, collection: 'review_replies' })
export class ReviewReply {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  reviewId: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ required: true, maxlength: 500 })
  content: string;

  @Prop({ required: true })
  createdAt: number;

  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt: number;

  @Prop({ default: 0 })
  helpfulCount: number;
}

export const ReviewReplySchema = SchemaFactory.createForClass(ReviewReply);

ReviewReplySchema.index({ reviewId: 1, createdAt: 1 });
