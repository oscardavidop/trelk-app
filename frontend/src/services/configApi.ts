// REST JSON helpers for /api/v1/ui/config endpoints
const BASE = '/api/v1/ui/config';

async function json<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.headers as Record<string, string> || {}),
    },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Full config ─────────────────────────────────
export interface CommandConfig {
  engine: string;
  inline?: { results_per_page?: number; show_url?: boolean };
}
export interface PremiumCommandConfig {
  alias: string;
  created_at?: string;
}
export interface DatetimeFormat {
  date?: string;
  time?: string;
  use_24h?: boolean;
}
export interface LocaleConfig {
  lang?: string;
  tz?: string;
  country?: string;
  datetime_format?: DatetimeFormat;
}
export interface UserConfig {
  commands: Record<string, CommandConfig>;
  premium_commands: Record<string, PremiumCommandConfig>;
  locale: LocaleConfig;
}
export interface FullConfigResponse {
  ok: boolean;
  config: UserConfig;
  preferences: Record<string, any>;
  lang?: string;
  tz?: string;
}

export function fetchConfig(): Promise<FullConfigResponse> {
  return json(BASE);
}

// ── Commands ────────────────────────────────────
export function upsertCommand(key: string, cmd: CommandConfig) {
  return json(`${BASE}/commands/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(cmd),
  });
}

export function deleteCommand(key: string) {
  return json(`${BASE}/commands/${encodeURIComponent(key)}`, { method: 'DELETE', body: JSON.stringify({}) });
}

// ── Premium Commands ────────────────────────────
export function upsertPremiumCommand(key: string, alias: string) {
  return json(`${BASE}/premium/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ alias }),
  });
}

export function deletePremiumCommand(key: string) {
  return json(`${BASE}/premium/${encodeURIComponent(key)}`, { method: 'DELETE', body: JSON.stringify({}) });
}

// ── Locale ──────────────────────────────────────
export function patchLocale(locale: Partial<LocaleConfig>) {
  return json(`${BASE}/locale`, { method: 'PATCH', body: JSON.stringify(locale) });
}
