import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentEventDocument = PaymentEvent & Document;

@Schema({ collection: 'events', timestamps: true })
export class PaymentEvent {
  @Prop({ required: true, index: true, unique: true })
  event_id: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ required: true, index: true })
  subscriptionId: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  eventBody: Record<string, any>;

  @Prop({ default: false })
  processed: boolean;

  @Prop({ default: false })
  invalid_signature: boolean;
}

export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);

PaymentEventSchema.index({ subscriptionId: 1, createdAt: -1 });
PaymentEventSchema.index({ eventType: 1, createdAt: -1 });
