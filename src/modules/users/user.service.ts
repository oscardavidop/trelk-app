// src/modules/users/user.service.ts

import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, PlanTier, IUserProFeatures, getPlanTemplate, FREE_PLAN_DEFAULTS } from './schemas/user.schema';
import { Model } from 'mongoose';
import { BOT_COMMANDS } from 'src/data/commands';

/** Datos del usuario extraídos de initData de Telegram */
export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(customerId: string): Promise<User> {
    const createdUser = new this.userModel({ customerId });
    return createdUser.save();
  }

  async findByCustomerId(customerId: string): Promise<User | null> {
    return this.userModel.findOne({ customerId }).exec();
  }

  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId }).exec();
  }

  /**
   * Busca un usuario por telegramId. Si no existe, lo crea.
   * Si existe, actualiza los campos de perfil de Telegram (idempotente).
   */
  async findOrCreateFromTelegram(tgUser: TelegramUserData): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ id: tgUser.id }).exec();

    if (existing) {
      // Actualizar campos que pudieron cambiar en Telegram
      existing.firstName = tgUser.first_name;
      existing.lastName = tgUser.last_name ?? '';
      existing.username = tgUser.username ?? '';
      existing.photoUrl = tgUser.photo_url ?? '';
      // existing.languageCode = tgUser.language_code ?? '';
      existing.isPremium = tgUser.is_premium ?? false;
      existing.lastLoginAt = new Date();
      return existing.save();
    }

    // Crear usuario nuevo
    const newUser = new this.userModel({
      id: tgUser.id,
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name ?? '',
      username: tgUser.username ?? '',
      photoUrl: tgUser.photo_url ?? '',
      // languageCode: tgUser.language_code ?? '',
      isPremium: tgUser.is_premium ?? false,
      lang: tgUser.language_code ?? 'es',
      lastLoginAt: new Date(),
    });
    return newUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async updateSetting(userId: number, settingKey: string, settingValue: boolean) {
    // Sanitizar: solo permitir claves de settings conocidas
    const ALLOWED_SETTINGS = [
      'auto_detect_lang', 'message_format', 'time_format', 'chat_actions',
      'notifications_settings', 'emoji_replies', 'share_username',
      'store_chat_history', 'allow_data_usage', 'notify_semanal_stats',
      'large_text', 'compact_mode', 'await_args',
    ];
    if (!ALLOWED_SETTINGS.includes(settingKey)) {
      return { modifiedCount: 0 };
    }
    return this.userModel.updateOne(
      { id: userId },
      { $set: { [`preferences.${settingKey}`]: settingValue } }
    ).exec();
  }

  /**
   * Actualiza configuración del usuario.
   * Solo permite campos de whitelist para evitar MongoDB injection.
   */
  async updateConfig(userId: number, config: any) {
    // deprecated: ahora cada config tiene su endpoint dedicado (updateLocale, patchCommandConfig, etc)
    return { modifiedCount: 0 };
    // Sanitizar: solo permitir claves de config conocidas y a un nivel de profundidad máximo
    // const ALLOWED_CONFIG_KEYS = ['config.locale.tz', 'config.locale.lang', 'bid'];
    // const sanitized: Record<string, any> = {};

    // for (const key of Object.keys(config || {})) {
    //   if (ALLOWED_CONFIG_KEYS.includes(key)) {

    //     sanitized[key] = config[key];
    //   }
    // }

    // if (Object.keys(sanitized).length === 0) {
    //   return { modifiedCount: 0 };
    // }

    // return this.userModel.updateOne(
    //   { id: userId },
    //   { $set: sanitized }
    // ).exec();
  }

  /** 
   * Actualiza el perfil del usuario (firstName, lastName, username).
   * Solo permite estos campos para evitar MongoDB injection.
   * Retorna { modifiedCount }
   */
  async updateProfile(userId: number, profileData: { firstName?: string; lastName?: string; email?: string }) {
    const updateFields: Record<string, any> = {};
    if (profileData.firstName !== undefined) updateFields.firstName = profileData.firstName;
    if (profileData.lastName !== undefined) updateFields.lastName = profileData.lastName;
    if (profileData.email !== undefined) updateFields.email = profileData.email;

    if (Object.keys(updateFields).length === 0) {
      return { modifiedCount: 0 };
    }

    return this.userModel.updateOne(
      { id: userId },
      {
        $set: {
          data: {
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            email: profileData.email,
          }
        }
      }
    ).exec();
  }

  /**
   * Update profile fields directly on the user doc.
   * Supports: firstName, lastName, email, phone, city
   */
  async updateProfileFields(telegramId: number, fields: Record<string, string>) {
    const ALLOWED = ['firstName', 'lastName', 'email', 'phone', 'city'];
    const $set: Record<string, any> = {};

    for (const [key, val] of Object.entries(fields)) {
      if (ALLOWED.includes(key)) {
        $set[key] = val;
      }
    }

    if (Object.keys($set).length === 0) return { modifiedCount: 0 };

    return this.userModel.updateOne(
      { telegramId },
      { $set },
    ).exec();
  }

  // ============================================================
  // Config Management — commands, premium commands, locale
  // ============================================================

  async getFullConfig(telegramId: number) {
    const user = await this.userModel.findOne({ id: telegramId }).select('config preferences lang tz').exec();
    if (!user) return null;
    return {
      config: user.config || { commands: {}, premium_commands: {}, locale: {} },
      preferences: user.preferences || {},
      lang: user.lang,
      tz: user.tz,
    };
  }

  async patchCommandConfig(telegramId: number, key: string, patch: Record<string, any>) {
    const sanitizedKey = key.replace(/[.$]/g, '_').toLowerCase().slice(0, 32);
    if (!['apk', 'shorten', 'tiktok'].includes(sanitizedKey)) {
      throw new BadRequestException('Unsupported command config key');
    }

    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).length === 0) {
      throw new BadRequestException('Patch payload is required');
    }

    const user = await this.userModel
      .findOne({ telegramId })
      .select(`config.commands.${sanitizedKey}`)
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const current = ((user as any)?.config?.commands?.[sanitizedKey] ?? {}) as Record<string, any>;
    const next = this.deepMerge(current, patch);

    this.validateCommandConfig(sanitizedKey, next);

    return this.userModel.updateOne(
      { telegramId },
      { $set: { [`config.commands.${sanitizedKey}`]: next } },
    ).exec();
  }

  private deepMerge(base: Record<string, any>, patch: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        base[k] &&
        typeof base[k] === 'object' &&
        !Array.isArray(base[k])
      ) {
        out[k] = this.deepMerge(base[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private validateCommandConfig(command: string, cfg: Record<string, any>) {
    if (command === 'apk') {
      if (!['aptoide', 'gplay'].includes(cfg.engine)) {
        throw new BadRequestException('apk.engine must be aptoide|gplay');
      }

      if (cfg.inline !== undefined) {
        if (typeof cfg.inline !== 'object' || Array.isArray(cfg.inline) || cfg.inline === null) {
          throw new BadRequestException('apk.inline must be an object');
        }

        if (cfg.inline.results_per_page !== undefined) {
          const n = cfg.inline.results_per_page;
          if (!Number.isInteger(n) || n < 1 || n > 50) {
            throw new BadRequestException('apk.inline.results_per_page must be integer 1-50');
          }
        }

        if (cfg.inline.show_url !== undefined && typeof cfg.inline.show_url !== 'boolean') {
          throw new BadRequestException('apk.inline.show_url must be boolean');
        }
      }
      return;
    }

    if (command === 'shorten') {
      if (!['tinyurl', 'bitly'].includes(cfg.engine)) {
        throw new BadRequestException('shorten.engine must be tinyurl|bitly');
      }
      return;
    }

    if (command === 'tiktok') {
      if (!['direct', 'callback'].includes(cfg.mode)) {
        throw new BadRequestException('tiktok.mode must be direct|callback');
      }
    }
  }

  async upsertPremiumCommand(
    telegramId: number,
    key: string, // Ejemplo: "menucustom" (El nuevo comando del usuario)
    alias: string, // Ejemplo: "menu" (El comando oficial de destino)
    proFeatures: IUserProFeatures,
    userCustomCommands: any
  ) {
    const sanitizedKey = key.replace(/[.$]/g, '_').toLowerCase().slice(0, 32);
    const targetAlias = alias.toLowerCase().trim();

    if (proFeatures.custom_commands.used_commands >= proFeatures.custom_commands.max_commands) {
      throw new ForbiddenException({
        ok: false,
        message: 'Custom command limit reached for your current plan.',
        error_code: 'LIMIT_REACHED_PREMIUM'
      });
    }

    const keyIsOfficial = BOT_COMMANDS.find(cmd =>
      cmd.uniqueName === sanitizedKey ||
      (cmd.alias && cmd.alias.some((a: string) => a.toLowerCase() === sanitizedKey))
    );

    if (keyIsOfficial) {
      throw new BadRequestException({
        ok: false,
        message: `The name '${sanitizedKey}' already exists as an official command.`,
        error_code: 'COMMAND_KEY_OFFICIAL'
      });
    }

    const officialTarget = BOT_COMMANDS.find(cmd =>
      cmd.uniqueName === targetAlias ||
      (cmd.alias && cmd.alias.some((a: string) => a.toLowerCase() === targetAlias))
    );

    if (!officialTarget) {
      throw new BadRequestException({
        ok: false,
        message: `The target command '${targetAlias}' does not exist.`,
        error_code: 'TARGET_COMMAND_NOT_FOUND'
      });
    }

    if (officialTarget.protected) {
      throw new BadRequestException({
        ok: false,
        message: `Cannot create an alias for the protected command '${targetAlias}'.`,
        error_code: 'TARGET_PROTECTED'
      });
    }

    if (userCustomCommands && userCustomCommands[sanitizedKey]) {
      throw new BadRequestException({
        ok: false,
        message: `You already have a custom command named '${sanitizedKey}'.`,
        error_code: 'COMMAND_KEY_DUPLICATED'
      });
    }

    return this.userModel.updateOne(
      { telegramId },
      {
        $set: {
          [`config.premium_commands.${sanitizedKey}`]: {
            alias: targetAlias,
            created_at: new Date().toISOString()
          },
        },
        $inc: { 'pro_features.custom_commands.used_commands': 1 }
      },
    ).exec();
  }




  async deletePremiumCommand(telegramId: number, key: string) {
    const sanitizedKey = key.replace(/[.$]/g, '_').toLowerCase();

    return this.userModel.updateOne(
      {
        telegramId,
        [`config.premium_commands.${sanitizedKey}`]: { $exists: true },
        'pro_features.custom_commands.used_commands': { $gt: 0 }
      },
      {
        $unset: { [`config.premium_commands.${sanitizedKey}`]: '' },
        $inc: { 'pro_features.custom_commands.used_commands': -1 }
      },
    ).exec();
  }


  async updateLocale(telegramId: number, locale: Record<string, any>) {

    const setFields: Record<string, any> = {};
    if (locale.lang) {
      setFields['config.locale.lang'] = locale.lang;
    }
    if (locale.tz) {
      setFields['config.locale.tz'] = locale.tz;
    }
    if (locale.country) setFields['config.locale.country'] = locale.country;
    if (locale.datetime_format) {
      for (const [k, v] of Object.entries(locale.datetime_format)) {
        setFields[`config.locale.datetime_format.${k}`] = v;
      }
    }
    if (Object.keys(setFields).length === 0) return { modifiedCount: 0 };
    return this.userModel.updateOne({ id: telegramId }, { $set: setFields }).exec();
  }

  // ============================================================
  // Subscription & Pro Features
  // ============================================================

  /** Get subscription + pro features for the authenticated user */
  async getSubscription(telegramId: number) {
    const user = await this.userModel.findOne({ telegramId })
      .select('pro_features limits_reset_date firstName username isPremium')
      .lean()
      .exec();
    if (!user) return null;

    // Auto-initialize for legacy users
    const features = user.pro_features || JSON.parse(JSON.stringify(FREE_PLAN_DEFAULTS));

    // Auto-reset daily limits if date changed
    const today = new Date().toISOString().slice(0, 10);
    if (user.limits_reset_date !== today) {
      await this.resetDailyLimits(telegramId, today);
      this.zeroDailyCounters(features);
    }

    return {
      pro_features: features,
      limits_reset_date: today,
      firstName: user.firstName,
      username: user.username,
      isPremium: user.isPremium,
    };
  }

  /** Request a plan change (upgrade / downgrade) */
  async requestPlanChange(telegramId: number, newPlan: PlanTier) {
    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) throw new BadRequestException('User not found');

    const features: IUserProFeatures = user.pro_features || JSON.parse(JSON.stringify(FREE_PLAN_DEFAULTS));
    const currentTier = features.subscription.tier;

    if (currentTier === newPlan) {
      throw new BadRequestException('Already on this plan');
    }

    // If there's already a pending change, reject
    if (features.subscription.change?.status === 'pending') {
      throw new BadRequestException('A plan change is already pending. Cancel it first.');
    }

    const validTiers: PlanTier[] = ['free', 'pro', 'ultra'];
    if (!validTiers.includes(newPlan)) {
      throw new BadRequestException('Invalid plan tier');
    }

    const now = new Date().toISOString();

    // For downgrades, schedule at end of current period. For upgrades, apply immediately.
    const isUpgrade = validTiers.indexOf(newPlan) > validTiers.indexOf(currentTier);

    if (isUpgrade) {
      // Apply immediately
      const template = getPlanTemplate(newPlan);
      // Preserve used counters
      template.limits.downloads_per_day.used = features.limits.downloads_per_day.used;
      template.limits.ai_requests_per_day.used = features.limits.ai_requests_per_day.used;
      template.limits.premium_ai_requests_per_day.used = features.limits.premium_ai_requests_per_day.used;
      template.limits.alerts.per_day.used = features.limits.alerts.per_day.used;
      template.limits.alerts.used = features.limits.alerts.used;
      template.limits.ssweb.per_day.used = features.limits.ssweb.per_day.used;
      template.limits.qr.per_day.used = features.limits.qr.per_day.used;
      template.custom_commands.used_commands = features.custom_commands.used_commands || 0;
      template.subscription = {
        tier: newPlan,
        started_at: now,
        expires_at: this.calcExpiry(now),
        auto_renew: features.subscription.auto_renew,
        change: {
          price: 0, // will be set by payment gateway
          new_plan: newPlan,
          changed_at: now,
          changed_from: currentTier,
          change_date: now,
          changed_by: 'user',
          confirmed: true,
          status: 'completed',
        },
      };
      return this.userModel.updateOne({ telegramId }, { $set: { pro_features: template } }).exec();
    } else {
      // Downgrade — schedule pending
      const change = {
        price: 0,
        new_plan: newPlan,
        changed_at: now,
        changed_from: currentTier,
        change_date: features.subscription.expires_at || now,
        changed_by: 'user' as const,
        confirmed: false,
        status: 'pending' as const,
      };
      return this.userModel.updateOne(
        { telegramId },
        { $set: { 'pro_features.subscription.change': change } },
      ).exec();
    }
  }

  /** Cancel a pending plan change */
  async cancelPlanChange(telegramId: number) {
    return this.userModel.updateOne(
      { telegramId, 'pro_features.subscription.change.status': 'pending' },
      { $set: { 'pro_features.subscription.change.status': 'canceled', 'pro_features.subscription.change.confirmed': false } },
    ).exec();
  }

  /** Toggle auto-renew */
  async setAutoRenew(telegramId: number, autoRenew: boolean) {
    return this.userModel.updateOne(
      { telegramId },
      { $set: { 'pro_features.subscription.auto_renew': autoRenew } },
    ).exec();
  }

  /** Increment a specific limit counter (called by limit guard) */
  async incrementLimit(telegramId: number, limitPath: string): Promise<boolean> {
    // First ensure daily reset
    await this.ensureDailyReset(telegramId);

    const user = await this.userModel.findOne({ telegramId }).select('pro_features').lean().exec();
    if (!user?.pro_features) return false;

    // Navigate the nested path to check total vs used
    const parts = limitPath.split('.');
    let obj: any = user.pro_features.limits;
    for (const p of parts) obj = obj?.[p];

    if (!obj || typeof obj.total !== 'number') return false;
    if (obj.used >= obj.total) return false; // limit exceeded

    const mongoPath = `pro_features.limits.${limitPath}.used`;
    await this.userModel.updateOne({ telegramId }, { $inc: { [mongoPath]: 1 } }).exec();
    return true;
  }

  // ── Private helpers ─────────────────────────────

  private async ensureDailyReset(telegramId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.userModel.updateOne(
      { telegramId, limits_reset_date: { $ne: today } },
      {
        $set: {
          limits_reset_date: today,
          'pro_features.limits.downloads_per_day.used': 0,
          'pro_features.limits.ai_requests_per_day.used': 0,
          'pro_features.limits.premium_ai_requests_per_day.used': 0,
          'pro_features.limits.alerts.per_day.used': 0,
          'pro_features.limits.ssweb.per_day.used': 0,
          'pro_features.limits.qr.per_day.used': 0,
        },
      },
    ).exec();
    return result.modifiedCount > 0;
  }

  private async resetDailyLimits(telegramId: number, today: string) {
    return this.userModel.updateOne(
      { telegramId },
      {
        $set: {
          limits_reset_date: today,
          'pro_features.limits.downloads_per_day.used': 0,
          'pro_features.limits.ai_requests_per_day.used': 0,
          'pro_features.limits.premium_ai_requests_per_day.used': 0,
          'pro_features.limits.alerts.per_day.used': 0,
          'pro_features.limits.ssweb.per_day.used': 0,
          'pro_features.limits.qr.per_day.used': 0,
        },
      },
    ).exec();
  }

  private zeroDailyCounters(features: IUserProFeatures) {
    features.limits.downloads_per_day.used = 0;
    features.limits.ai_requests_per_day.used = 0;
    features.limits.premium_ai_requests_per_day.used = 0;
    features.limits.alerts.per_day.used = 0;
    features.limits.ssweb.per_day.used = 0;
    features.limits.qr.per_day.used = 0;
  }

  private calcExpiry(from: string): string {
    const d = new Date(from);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }
}
