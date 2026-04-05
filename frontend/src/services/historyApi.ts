import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/history';

async function json<T = any>(url: string): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────

export interface HistoryEntry {
  _id: string;
  userId: number;
  type: 'command' | 'favorite_added' | 'achievement' | 'inline_query';
  command?: string;
  args?: string;
  item?: string;
  achievementName?: string;
  timestamp: number;
  date: string;
}

export interface HistoryPage {
  items: HistoryEntry[];
  hasMore: boolean;
  nextOffset: number;
  total?: number;
}

export interface ActivityStats {
  commandsToday: number;
  commandsTotal: number;
  favoritesTotal: number;
  achievementsTotal: number;
  streakDays: number;
}

export interface GlobalStats {
  commandsToday: number;
  commandsYesterday: number;
}

// ── API calls ────────────────────────────────────

export function fetchHistory(limit = 20, offset = 0): Promise<HistoryPage> {
  return json(`${BASE}?limit=${limit}&offset=${offset}`);
}

export function fetchActivityStats(): Promise<ActivityStats> {
  return json(`${BASE}/stats`);
}

export async function deleteHistoryEntries(ids: string[]): Promise<{ ok: boolean; status: string; expiresAt: number; jobId: string; count: number }> {
  const res = await authFetch(BASE, {
    method: 'DELETE',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAllHistory(): Promise<{ ok: boolean; status: string; expiresAt: number; jobId: string; count: number }> {
  const res = await authFetch(BASE, {
    method: 'DELETE',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function undoHistoryDelete(ids?: string[], jobId?: string): Promise<{ ok: boolean; restored: number }> {
  const body: Record<string, any> = {};
  if (ids?.length) body.ids = ids;
  if (jobId) body.jobId = jobId;
  const res = await authFetch(`${BASE}/undo`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function fetchGlobalStats(): Promise<GlobalStats> {
  return json(`${BASE}/global`);
}

export interface WeeklyRecap {
  commandsThisWeek: number;
  commandsLastWeek: number;
  commandsTrend: number;
  favoritesAdded: number;
  achievementsUnlocked: number;
  topCommands: { command: string; count: number }[];
  uniqueCommandsUsed: number;
  weekStart: number;
  weekEnd: number;
}

export async function fetchWeeklyRecap(): Promise<WeeklyRecap> {
  const res = await json<{ ok: boolean; data: WeeklyRecap }>(`${BASE}/weekly-recap`);
  return res.data;
}
