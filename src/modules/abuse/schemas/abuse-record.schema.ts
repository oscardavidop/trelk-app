import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AbuseRecordDocument = AbuseRecord & Document;

@Schema({ versionKey: false, collection: 'abuse_records' })
export class AbuseRecord {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  hashedIP: string;

  @Prop()
  userAgent?: string;

  @Prop()
  deviceFingerprint?: string;

  @Prop({ default: 0 })
  spamAttempts: number;

  @Prop({ default: 0 })
  rejectedReviews: number;

  @Prop({ default: 0 })
  suspiciousPatterns: number;

  @Prop({ default: 0 })
  rateLimitHits: number;

  @Prop({ default: 0 })
  abuseScore: number;

  @Prop({ default: false })
  isShadowBanned: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  blockedUntil?: number;

  @Prop({ type: [String], default: [] })
  flags: string[];

  @Prop({ default: Date.now })
  firstSeen: number;

  @Prop({ default: Date.now })
  lastActivity: number;
}

export const AbuseRecordSchema = SchemaFactory.createForClass(AbuseRecord);

AbuseRecordSchema.index({ userId: 1 }, { unique: true });
AbuseRecordSchema.index({ hashedIP: 1 });
AbuseRecordSchema.index({ abuseScore: -1 });
AbuseRecordSchema.index({ isShadowBanned: 1 });
