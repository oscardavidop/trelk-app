/**
 * Mock data for Discover page — smart exploration.
 * Will be replaced by real API when personalization backend is ready.
 */

export interface DiscoverCommand {
  slug: string;
  reason?: string;       // "Because you used /play"
  badge?: string;        // "Recommended" | "Underrated" | "New"
  liveUsers?: number;    // "124 using now"
}

export interface DiscoverIntent {
  key: string;
  emoji: string;
  labelKey: string;      // i18n key
  category: string;      // maps to route ?cat=
}

export interface DiscoverData {
  forYou: DiscoverCommand[];
  becauseUsed: { trigger: string; commands: DiscoverCommand[] };
  tryNew: DiscoverCommand[];
  hiddenGems: DiscoverCommand[];
  liveNow: DiscoverCommand[];
  quickActions: string[];
  intents: DiscoverIntent[];
}

// ── Deterministic shuffle seeded by day ──────────
function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  let seed = dailySeed();
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Raw pools ────────────────────────────────────

const FOR_YOU_POOL: DiscoverCommand[] = [
  { slug: 'play', badge: 'Recommended', reason: 'discover.reason_music_activity' },
  { slug: 'tts', badge: 'Recommended', reason: 'discover.reason_popular_similar' },
  { slug: 'ssweb', badge: 'Recommended', reason: 'discover.reason_coused_apk' },
  { slug: 'translate', badge: 'Recommended', reason: 'discover.reason_multilingual' },
  { slug: 'aiimage', badge: 'Recommended', reason: 'discover.reason_ai_trend' },
  { slug: 'sticker', badge: 'Recommended', reason: 'discover.reason_media_usage' },
];

const BECAUSE_TRIGGER = 'play';
const BECAUSE_POOL: DiscoverCommand[] = [
  { slug: 'lyrics', reason: 'discover.reason_coused_play' },
  { slug: 'spotify', reason: 'discover.reason_coused_play' },
  { slug: 'shazam', reason: 'discover.reason_coused_play' },
  { slug: 'tts', reason: 'discover.reason_coused_play' },
];

const TRY_NEW_POOL: DiscoverCommand[] = [
  { slug: 'aiimage', badge: 'New' },
  { slug: 'translate', badge: 'New' },
  { slug: 'gemini', badge: 'New' },
  { slug: 'carbon', badge: 'New' },
  { slug: 'qr', badge: 'New' },
];

const HIDDEN_GEMS_POOL: DiscoverCommand[] = [
  { slug: 'md5', badge: 'Underrated' },
  { slug: 'whois', badge: 'Underrated' },
  { slug: 'password', badge: 'Underrated' },
  { slug: 'shorten', badge: 'Underrated' },
  { slug: 'base64', badge: 'Underrated' },
  { slug: 'calc', badge: 'Underrated' },
];

const LIVE_POOL: DiscoverCommand[] = [
  { slug: 'ssweb', liveUsers: 124 },
  { slug: 'translate', liveUsers: 89 },
  { slug: 'apk', liveUsers: 203 },
  { slug: 'play', liveUsers: 156 },
  { slug: 'sticker', liveUsers: 67 },
];

const QUICK_ACTIONS = ['play', 'translate', 'ssweb', 'help', 'apk', 'tts'];

const INTENTS: DiscoverIntent[] = [
  { key: 'music', emoji: '🎵', labelKey: 'discover.intent_music', category: 'music' },
  { key: 'web', emoji: '🌐', labelKey: 'discover.intent_web', category: 'utilities' },
  { key: 'ai', emoji: '🧠', labelKey: 'discover.intent_ai', category: 'ai' },
  { key: 'downloads', emoji: '📥', labelKey: 'discover.intent_downloads', category: 'downloader' },
  { key: 'security', emoji: '🔐', labelKey: 'discover.intent_security', category: 'tools' },
  { key: 'media', emoji: '🎨', labelKey: 'discover.intent_media', category: 'media' },
  { key: 'fun', emoji: '🎮', labelKey: 'discover.intent_fun', category: 'entertainment' },
  { key: 'info', emoji: '📊', labelKey: 'discover.intent_info', category: 'information' },
];

// ── Public getter (changes daily, not per render) ─

export function getDiscoverData(): DiscoverData {
  return {
    forYou: seededShuffle(FOR_YOU_POOL).slice(0, 5),
    becauseUsed: {
      trigger: BECAUSE_TRIGGER,
      commands: seededShuffle(BECAUSE_POOL).slice(0, 3),
    },
    tryNew: seededShuffle(TRY_NEW_POOL).slice(0, 4),
    hiddenGems: seededShuffle(HIDDEN_GEMS_POOL).slice(0, 4),
    liveNow: seededShuffle(LIVE_POOL).slice(0, 4),
    quickActions: QUICK_ACTIONS,
    intents: INTENTS,
  };
}
