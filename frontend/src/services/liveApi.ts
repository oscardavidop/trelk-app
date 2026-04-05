import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/live';

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

export interface LiveMetrics {
  ok: boolean;
  activeUsers: number;
  commandsPerMinute: number;
  trending: { slug: string; growth: number }[];
}

// ── API ──────────────────────────────────────────

export function fetchLiveMetrics(): Promise<LiveMetrics> {
  return json<LiveMetrics>(BASE);
}
