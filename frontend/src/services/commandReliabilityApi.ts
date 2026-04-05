import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/command-reliability';

// ── Types ──────────────────────────────────────────

export interface ReliabilityScore {
  command: string;
  reliability: number;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  period: '1h' | '24h' | '7d';
}

export interface TimelinePoint {
  timestamp: number;
  success: number;
  failure: number;
  avgResponseTimeMs: number;
}

export interface ReliabilityAlert {
  command: string;
  reliability: number;
  failureCount: number;
  avgResponseTimeMs: number;
  severity: 'warning' | 'critical';
}

// ── API calls ──────────────────────────────────────

export async function fetchReliabilityScore(
  command: string,
  period: '1h' | '24h' | '7d' = '24h',
): Promise<ReliabilityScore> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(command)}?period=${period}`);
  if (!res.ok) throw new Error(`reliability score ${res.status}`);
  return res.json();
}

export async function fetchReliabilityTimeline(
  command: string,
  hours = 24,
  buckets = 24,
): Promise<TimelinePoint[]> {
  const res = await authFetch(
    `${BASE}/${encodeURIComponent(command)}/timeline?hours=${hours}&buckets=${buckets}`,
  );
  if (!res.ok) throw new Error(`reliability timeline ${res.status}`);
  const data = await res.json();
  return data.points;
}

export async function fetchReliabilityAlerts(threshold = 95): Promise<ReliabilityAlert[]> {
  const res = await authFetch(`${BASE}/meta/alerts?threshold=${threshold}`);
  if (!res.ok) throw new Error(`reliability alerts ${res.status}`);
  const data = await res.json();
  return data.alerts;
}

export async function trackCommandExecution(
  command: string,
  success: boolean,
  responseTimeMs: number,
  errorType?: string,
): Promise<void> {
  await authFetch(`${BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, success, responseTimeMs, errorType }),
  });
}
