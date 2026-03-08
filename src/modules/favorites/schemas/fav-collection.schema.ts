import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FavCollectionDocument = FavCollection & Document;

@Schema({ timestamps: true, collection: 'fav_collections' })
export class FavCollection {
  @Prop({ type: Number, required: true, index: true })
  userId: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 60 })
  name: string;

  @Prop({ type: Number, default: 0 })
  count: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FavCollectionSchema = SchemaFactory.createForClass(FavCollection);

FavCollectionSchema.index({ userId: 1, name: 1 }, { unique: true });
