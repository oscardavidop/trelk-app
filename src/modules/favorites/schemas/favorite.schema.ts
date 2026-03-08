import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type FavoriteDocument = Favorite & Document;

@Schema({ timestamps: true, collection: 'favorites' })
export class Favorite {
  @Prop({ type: String, required: true })
  context: string;

  @Prop({ type: String, required: true })
  engine: string;

  @Prop({ type: String, required: true })
  engine_id: string;

  @Prop({ type: Number, required: true, index: true })
  userId: number;

  @Prop({ type: SchemaTypes.Mixed })
  data: Record<string, any>;

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  collectionId: any;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

FavoriteSchema.index({ userId: 1, _id: -1 });
FavoriteSchema.index({ userId: 1, context: 1, _id: -1 });
FavoriteSchema.index({ userId: 1, engine: 1, _id: -1 });
FavoriteSchema.index({ userId: 1, collectionId: 1, _id: -1 });
FavoriteSchema.index({ userId: 1, engine: 1, engine_id: 1 }, { unique: true });
FavoriteSchema.index(
  { 'data.caption': 'text', 'data.title': 'text' },
  { weights: { 'data.caption': 10, 'data.title': 5 }, default_language: 'spanish' },
);
