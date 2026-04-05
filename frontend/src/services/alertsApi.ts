import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/alerts';

export interface AlertItem {
  id: string;
  publicId: string;
  text: string;
  chatId: number;
  runAt: number;
  createdAt: number;
  secondsLeft: number;
  totalSeconds: number;
  type: string;
  status: 'scheduled' | 'expired';
}

export interface AlertsResponse {
  ok: boolean;
  alerts: AlertItem[];
}

export interface AlertDetailResponse {
  ok: boolean;
  alert: AlertItem;
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const res = await authFetch(BASE);
  if (!res.ok) throw new Error(`alerts ${res.status}`);
  const data: AlertsResponse = await res.json();
  return data.alerts;
}

export async function fetchAlert(id: string): Promise<AlertItem> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`alert detail ${res.status}`);
  const data: AlertDetailResponse = await res.json();
  return data.alert;
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`delete alert ${res.status}`);
}

export async function deleteAllAlerts(): Promise<number> {
  const res = await authFetch(BASE, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`delete all alerts ${res.status}`);
  const data = await res.json();
  return data.deleted;
}
