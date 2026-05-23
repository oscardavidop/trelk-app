import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  @Prop({ required: true, index: true })
  paypal_subscription_id: string;

  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  status: string;

  @Prop()
  plan_id: string;

  @Prop()
  amount: number;

  @Prop()
  currency: string;

  @Prop()
  quantity: string;

  @Prop()
  start_time: string;

  @Prop({ type: Date })
  next_billing_date: Date;

  @Prop()
  paypal_payerId: string;

  @Prop({ default: 'paypal', index: true })
  provider?: 'paypal' | 'telegram_stars' | 'telegram_card';

  @Prop()
  telegram_charge_id?: string;

  @Prop({ default: false })
  activation_notified: boolean;

  @Prop({ default: false })
  features_applied: boolean;

  @Prop({ default: false })
  invalid_signature: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ user_id: 1, createdAt: -1 });
SubscriptionSchema.index({ paypal_subscription_id: 1 }, { unique: true });
