// src/modules/auth/schemas/token.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenDocument = Token & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Token {
  /** Auto-expire token documents after 7 days */
  @Prop({ type: Date, default: () => new Date(), expires: 604800 })
  expiresAt: Date;
  @Prop()
  type?: string;

  @Prop()
  sub?: number;

  @Prop()
  device?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  lastUsed?: Date;

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop()
  ip?: string;

  @Prop()
  platform?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  deviceId?: string;

  @Prop({ unique: true, required: true, index: true })
  token: string;

  @Prop()
  session_id?: string;

  @Prop({ default: false })
  revoked: boolean;

  @Prop()
  scope?: string;

  @Prop({ default: false })
  isBlockedFor2fa: boolean;

  @Prop()
  locationRegion?: string;

  @Prop()
  locationCountry?: string;

  @Prop()
  locationCity?: string;

  @Prop()
  locationLat?: string;

  @Prop()
  locationLng?: string;

  @Prop()
  locationTimeZone?: string;

  @Prop()
  createdAt: Date;

  @Prop({type: Object, default: {}})
  userTlg: object;

  // 👇 Método opcional para revocar token
  revoke() {
    this.revoked = true;
  }
}

export const TokenSchema = SchemaFactory.createForClass(Token);
