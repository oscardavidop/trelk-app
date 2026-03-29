const BASE = '/api/v1/ui/notifications';

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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Types ---

export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  titleKey: string;
  messageKey: string;
  titleParams?: Record<string, unknown>;
  messageParams?: Record<string, unknown>;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: number;
  readAt?: number;
  priority: 'low' | 'normal' | 'high';
  groupId?: string;
  link?: string;
}

export interface NotificationsListResponse {
  ok: boolean;
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  ok: boolean;
  count: number;
}

// --- API Functions ---

export function fetchNotifications(
  page = 1,
  limit = 20,
  unreadOnly = false,
): Promise<NotificationsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (unreadOnly) params.set('unreadOnly', 'true');
  return json(`${BASE}?${params}`);
}

export function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return json(`${BASE}/unread-count`);
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: JSON.stringify({}) });
}

export function markAllNotificationsRead(): Promise<{ ok: boolean; count: number }> {
  return json(`${BASE}/read-all`, { method: 'PATCH', body: JSON.stringify({}) });
}

export function deleteNotification(id: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
