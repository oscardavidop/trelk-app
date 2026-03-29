import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReplyHelpfulDocument = ReplyHelpful & Document;

@Schema({ versionKey: false, collection: 'reply_helpfuls' })
export class ReplyHelpful {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'ReviewReply', index: true })
  replyId: Types.ObjectId;

  @Prop({ required: true })
  createdAt: number;
}

export const ReplyHelpfulSchema = SchemaFactory.createForClass(ReplyHelpful);
ReplyHelpfulSchema.index({ userId: 1, replyId: 1 }, { unique: true });
