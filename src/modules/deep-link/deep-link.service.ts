import { Injectable, Logger } from '@nestjs/common';

export interface DeepLinkIntent {
  type: 'command' | 'command_review' | 'profile' | 'settings' | 'page' | 'unknown';
  target: string;
  params: Record<string, string>;
  route: string;
}

/**
 * Parses deep link start parameters from Telegram's `start` query param.
 * Format: t.me/botname?start=<encoded_payload>
 * 
 * Supported formats:
 *   cmd_<command>                → open command detail
 *   cmd_<command>_review_<id>   → open specific review
 *   profile                     → open profile page
 *   settings                    → open settings
 *   page_<pageName>             → open specific page
 *   ref_<code>                  → referral tracking
 */
@Injectable()
export class DeepLinkService {
  private readonly logger = new Logger(DeepLinkService.name);

  parse(startParam: string, userId: string | number): DeepLinkIntent {
    if (!startParam) {
      return { type: 'unknown', target: '', params: {}, route: `/users/ui/${userId}` };
    }

    const param = startParam.trim();
    const base = `/users/ui/${userId}`;

    // cmd_<command>_review_<reviewId>
    const reviewMatch = param.match(/^cmd_([a-z0-9_]+)_review_(.+)$/i);
    if (reviewMatch) {
      return {
        type: 'command_review',
        target: reviewMatch[1],
        params: { reviewId: reviewMatch[2] },
        route: `${base}/bot-commands/${reviewMatch[1]}/reviews?highlight=${reviewMatch[2]}`,
      };
    }

    // cmd_<command>
    const cmdMatch = param.match(/^cmd_([a-z0-9_]+)$/i);
    if (cmdMatch) {
      return {
        type: 'command',
        target: cmdMatch[1],
        params: {},
        route: `${base}/bot-commands/${cmdMatch[1]}`,
      };
    }

    // page_<name>
    const pageMatch = param.match(/^page_(.+)$/i);
    if (pageMatch) {
      const pageMap: Record<string, string> = {
        home: base,
        hub: `${base}/hub`,
        commands: `${base}/bot-commands`,
        favorites: `${base}/command-favorites`,
        achievements: `${base}/achievements`,
        discover: `${base}/discover`,
        labs: `${base}/labs`,
        settings: `${base}/settings-hub`,
        profile: `${base}/profile-tab`,
        subscription: `${base}/subscription`,
        notifications: `${base}/notifications`,
        activity: `${base}/activity`,
        alerts: `${base}/alerts`,
      };
      const route = pageMap[pageMatch[1].toLowerCase()] || base;
      return { type: 'page', target: pageMatch[1], params: {}, route };
    }

    // profile
    if (param === 'profile') {
      return { type: 'profile', target: 'profile', params: {}, route: `${base}/profile-tab` };
    }

    // settings
    if (param === 'settings') {
      return { type: 'settings', target: 'settings', params: {}, route: `${base}/settings-hub` };
    }

    // ref_<code> — referral (track + redirect to home)
    const refMatch = param.match(/^ref_(.+)$/i);
    if (refMatch) {
      return { type: 'page', target: 'home', params: { ref: refMatch[1] }, route: base };
    }

    this.logger.warn(`Unknown deep link: ${param}`);
    return { type: 'unknown', target: param, params: {}, route: base };
  }
}
