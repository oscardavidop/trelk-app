import { authFetch } from '../lib/authFetch';

export interface DeviceSession {
  id: string;
  device: string;
  browser?: string;
  os?: string;
  ip?: string;
  platform?: string;
  location?: string | null;
  createdAt: string;
  lastUsed: string;
  isCurrent: boolean;
}

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSessions(): Promise<DeviceSession[]> {
  const data = await json<{ ok: boolean; sessions: DeviceSession[] }>('/api/v1/auth/sessions');
  return data.sessions ?? [];
}

export async function revokeSession(id: string): Promise<void> {
  await json(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function revokeAllSessions(): Promise<number> {
  const data = await json<{ ok: boolean; revoked: number }>('/api/v1/auth/sessions', { method: 'DELETE' });
  return data.revoked ?? 0;
}
