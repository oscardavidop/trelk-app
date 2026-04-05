/**
 * Tips for the "Did you know?" section.
 * Each entry is an i18n key in the 'home' namespace.
 * Rotation avoids recent repeats via sessionStorage.
 */

const ALL_TIPS = [
  'tip_tts',
  'tip_alert',
  'tip_ssweb',
  'tip_inline',
  'tip_translate',
  'tip_play',
  'tip_sticker',
] as const;

const STORAGE_KEY = 'tip:recent';
const MAX_RECENT = 3;

/**
 * Pick a tip that wasn't shown recently (this session).
 * Falls back to random if all have been shown.
 */
export function pickTip(): string {
  let recent: string[] = [];
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) recent = JSON.parse(stored);
  } catch { /* ignore */ }

  const available = ALL_TIPS.filter((t) => !recent.includes(t));
  const pool = available.length > 0 ? available : [...ALL_TIPS];
  const tip = pool[Math.floor(Math.random() * pool.length)];

  // Record this tip
  recent.push(tip);
  if (recent.length > MAX_RECENT) recent = recent.slice(-MAX_RECENT);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }

  return tip;
}
