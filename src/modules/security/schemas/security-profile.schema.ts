import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface SecurityQuestion {
  questionId: string;
  answerHash: string;
}

export type SecurityProfileDocument = SecurityProfile & Document;

@Schema({ timestamps: true })
export class SecurityProfile {
  @Prop({ required: true, unique: true, index: true })
  telegramId: number;

  @Prop({ default: false })
  pinEnabled: boolean;

  /** bcrypt-hashed 4–6 digit PIN */
  @Prop({ default: '' })
  pinHash: string;

  /** Consecutive failed attempts since last success */
  @Prop({ default: 0 })
  failedAttempts: number;

  /** Timestamp until which the account is PIN-locked */
  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;

  /** Auto-lock after N minutes of inactivity (0 = disabled) */
  @Prop({ default: 5 })
  lockAfterMinutes: number;

  /** Last successful PIN verification */
  @Prop({ type: Date, default: null })
  lastVerifiedAt: Date | null;

  /** Security questions for PIN recovery */
  @Prop({ type: [{ questionId: String, answerHash: String }], default: [] })
  securityQuestions: SecurityQuestion[];

  /** Failed recovery attempts */
  @Prop({ default: 0 })
  recoveryFailedAttempts: number;

  /** Recovery lockout timestamp */
  @Prop({ type: Date, default: null })
  recoveryLockedUntil: Date | null;
}

export const SecurityProfileSchema = SchemaFactory.createForClass(SecurityProfile);
