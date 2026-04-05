import { authFetch } from '../lib/authFetch';

export interface BotStatus {
  status: 'online' | 'degraded' | 'down';
  latency_ms: number;
  error_rate: number;
  updated_at: string;
}

export async function fetchBotStatus(): Promise<BotStatus> {
  const res = await authFetch('/api/v1/status');
  if (!res.ok) throw new Error('Status fetch failed');
  return res.json();
}
