import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Feature flags basados en env vars.
 * Permiten activar/desactivar features sin deploy.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly flags: Map<string, boolean> = new Map();

  constructor(private readonly config: ConfigService) {
    this.flags.set('ai_summary', this.envBool('ENABLE_AI_SUMMARY', true));
    this.flags.set('signals', this.envBool('ENABLE_SIGNALS', true));
    this.flags.set('notifications', this.envBool('ENABLE_NOTIFICATIONS', true));
    this.flags.set('moderation', this.envBool('ENABLE_MODERATION', true));
    this.flags.set('recommendations', this.envBool('ENABLE_RECOMMENDATIONS', true));
    this.flags.set('gamification', this.envBool('ENABLE_GAMIFICATION', true));
    this.flags.set('reports', this.envBool('ENABLE_REPORTS', true));
    this.flags.set('rate_limit', this.envBool('ENABLE_RATE_LIMIT', true));
    this.flags.set('abuse_detection', this.envBool('ENABLE_ABUSE_DETECTION', true));
    this.flags.set('sse', this.envBool('ENABLE_SSE', true));
    this.flags.set('pin_security', this.envBool('ENABLE_PIN_SECURITY', true));
    this.flags.set('search_pro', this.envBool('ENABLE_SEARCH_PRO', true));
    this.flags.set('deep_linking', this.envBool('ENABLE_DEEP_LINKING', true));
    this.flags.set('personalization', this.envBool('ENABLE_PERSONALIZATION', true));
    this.flags.set('analytics_tracking', this.envBool('ENABLE_ANALYTICS_TRACKING', true));
    this.flags.set('offline_mode', this.envBool('ENABLE_OFFLINE_MODE', true));
  }

  isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }

  getAll(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }

  /** Runtime override (for gradual rollout or emergency kill) */
  setFlag(flag: string, value: boolean): void {
    this.flags.set(flag, value);
  }

  private envBool(key: string, fallback: boolean): boolean {
    const val = this.config.get<string>(key);
    if (val === undefined || val === null || val === '') return fallback;
    return val === 'true' || val === '1';
  }
}
