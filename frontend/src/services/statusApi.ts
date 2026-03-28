export interface BotStatus {
  status: 'online' | 'degraded' | 'down';
  latency_ms: number;
  error_rate: number;
  updated_at: string;
}

export async function fetchBotStatus(): Promise<BotStatus> {
  const res = await fetch('/api/v1/status', { credentials: 'include' });
  if (!res.ok) throw new Error('Status fetch failed');
  return res.json();
}
