// src/modules/users/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// ── Plan tier types ──────────────────────────────
export type PlanTier = 'free' | 'pro' | 'ultra';

export interface ILimitCounter {
  total: number;
  used: number;
}

export interface IUserProFeatures {
  limits: {
    downloads_per_day: ILimitCounter;
    ai_requests_per_day: ILimitCounter;
    premium_ai_requests_per_day: ILimitCounter;
    alerts: { per_day: ILimitCounter; total: number; used: number };
    ssweb: { per_day: ILimitCounter };
    qr: { per_day: ILimitCounter };
    file_upload_size_mb: number;
  };
  performance: {
    queue_priority: 'low' | 'normal' | 'high';
    response_speed_multiplier: number;
    server_region_preference?: string;
  };
  support: {
    priority: 'standard' | 'pro' | 'vip';
    dedicated_channel?: string;
    live_chat_access: boolean;
  };
  custom_commands: {
    available: boolean;
    max_commands: number;
    used_commands?: number;
  };
  subscription: {
    tier: PlanTier;
    started_at: string;
    expires_at?: string;
    auto_renew: boolean;
    change?: {
      price: number;
      new_plan: string;
      changed_at: string;
      changed_from: string;
      change_date: string;
      changed_by: 'user' | 'admin' | 'system';
      confirmed: boolean;
      status: 'pending' | 'completed' | 'canceled';
      forward_confirmations?: Record<string, any>;
    };
  };
}

/** Default pro_features for free-tier users */
export const FREE_PLAN_DEFAULTS: IUserProFeatures = {
  limits: {
    downloads_per_day: { total: 10, used: 0 },
    ai_requests_per_day: { total: 15, used: 0 },
    premium_ai_requests_per_day: { total: 0, used: 0 },
    alerts: { per_day: { total: 3, used: 0 }, total: 10, used: 0 },
    ssweb: { per_day: { total: 5, used: 0 } },
    qr: { per_day: { total: 10, used: 0 } },
    file_upload_size_mb: 10,
  },
  performance: {
    queue_priority: 'low',
    response_speed_multiplier: 1,
  },
  support: {
    priority: 'standard',
    live_chat_access: false,
  },
  custom_commands: {
    available: false,
    max_commands: 0,
    used_commands: 0,
  },
  subscription: {
    tier: 'free',
    started_at: new Date().toISOString(),
    auto_renew: false,
  },
};

export const PRO_PLAN_TEMPLATE: Partial<IUserProFeatures> = {
  limits: {
    downloads_per_day: { total: 100, used: 0 },
    ai_requests_per_day: { total: 200, used: 0 },
    premium_ai_requests_per_day: { total: 50, used: 0 },
    alerts: { per_day: { total: 25, used: 0 }, total: 500, used: 0 },
    ssweb: { per_day: { total: 50, used: 0 } },
    qr: { per_day: { total: 100, used: 0 } },
    file_upload_size_mb: 50,
  },
  performance: {
    queue_priority: 'normal',
    response_speed_multiplier: 2,
  },
  support: {
    priority: 'pro',
    live_chat_access: true,
  },
  custom_commands: {
    available: true,
    max_commands: 25,
    used_commands: 0,
  },
};

export const ULTRA_PLAN_TEMPLATE: Partial<IUserProFeatures> = {
  limits: {
    downloads_per_day: { total: 1000, used: 0 },
    ai_requests_per_day: { total: 2000, used: 0 },
    premium_ai_requests_per_day: { total: 500, used: 0 },
    alerts: { per_day: { total: 100, used: 0 }, total: 5000, used: 0 },
    ssweb: { per_day: { total: 500, used: 0 } },
    qr: { per_day: { total: 1000, used: 0 } },
    file_upload_size_mb: 200,
  },
  performance: {
    queue_priority: 'high',
    response_speed_multiplier: 5,
  },
  support: {
    priority: 'vip',
    live_chat_access: true,
  },
  custom_commands: {
    available: true,
    max_commands: 100,
    used_commands: 0,
  },
};

export function getPlanTemplate(tier: PlanTier): IUserProFeatures {
  const base = JSON.parse(JSON.stringify(FREE_PLAN_DEFAULTS)) as IUserProFeatures;
  const overlay = tier === 'ultra' ? ULTRA_PLAN_TEMPLATE : tier === 'pro' ? PRO_PLAN_TEMPLATE : {};
  return { ...base, ...overlay, limits: { ...base.limits, ...(overlay as any).limits }, performance: { ...base.performance, ...(overlay as any).performance }, support: { ...base.support, ...(overlay as any).support }, custom_commands: { ...base.custom_commands, ...(overlay as any).custom_commands } } as IUserProFeatures;
}

@Schema({ timestamps: true })
export class User {

  @Prop({ unique: true, required: false, index: true })
  id: number;

  /** Telegram user ID — source of truth for identity */
  @Prop({ unique: true, sparse: true, index: true })
  telegramId: number;

  @Prop({ unique: true, required: false, index: true })
  customerId: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  username: string;

  @Prop()
  photoUrl: string;

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ type: Object, default: {} })
  preferences: Record<string, boolean>;

  @Prop({ type: String, default: 'es' })
  lang: string;

  @Prop({ type: String, default: 'GMT' })
  tz: string;

  @Prop({
    type: Object,
    default: {
      commands: {},
      premium_commands: {},
      locale: {
        lang: 'es',
        tz: 'America/Bogota',
        country: 'CO',
        datetime_format: {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        },
      },
    },
  })
  config: {
    commands: Record<string, {
      engine: string;
      inline: { results_per_page: number; show_url: boolean };
    }>;
    premium_commands: Record<string, {
      alias: string;
      created_at: string;
    }>;
    locale: {
      lang: string;
      tz: string;
      country: string;
      datetime_format: {
        month: string;
        day: string;
        year: string;
        hour: string;
        minute: string;
        second: string;
      };
    };
  };

  @Prop()
  lastLoginAt: Date;

  @Prop({ type: Object, default: () => JSON.parse(JSON.stringify(FREE_PLAN_DEFAULTS)) })
  pro_features: IUserProFeatures;

  /** Last time daily limits were reset (UTC date string YYYY-MM-DD) */
  @Prop({ type: String, default: '' })
  limits_reset_date: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
