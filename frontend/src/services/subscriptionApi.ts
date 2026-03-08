// REST JSON helpers for /api/v1/ui/subscription endpoints
const BASE = '/api/v1/ui/subscription';

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

// ── Types ────────────────────────────────────────
export type PlanTier = 'free' | 'pro' | 'ultra';

export interface LimitCounter {
  total: number;
  used: number;
}

export interface ProFeatures {
  limits: {
    downloads_per_day: LimitCounter;
    ai_requests_per_day: LimitCounter;
    premium_ai_requests_per_day: LimitCounter;
    alerts: { per_day: LimitCounter; total: number; used: number };
    ssweb: { per_day: LimitCounter };
    qr: { per_day: LimitCounter };
    file_upload_size_mb: number;
  };
  performance: {
    queue_priority: 'low' | 'normal' | 'high';
    response_speed_multiplier: number;
    server_region_preference?: string;
  };
  support: {
    priority: 'standard' | 'pro' | 'vip';
    dedicated_channel?: string;
    live_chat_access: boolean;
  };
  custom_commands: {
    available: boolean;
    max_commands: number;
    used_commands?: number;
  };
  subscription: {
    tier: PlanTier;
    started_at: string;
    expires_at?: string;
    auto_renew: boolean;
    change?: {
      price: number;
      new_plan: string;
      changed_at: string;
      changed_from: string;
      change_date: string;
      changed_by: 'user' | 'admin' | 'system';
      confirmed: boolean;
      status: 'pending' | 'completed' | 'canceled';
    };
  };
}

export interface SubscriptionResponse {
  ok: boolean;
  pro_features: ProFeatures;
  limits_reset_date: string;
  firstName?: string;
  username?: string;
  isPremium?: boolean;
}

// ── Endpoints ────────────────────────────────────

export function fetchSubscription(): Promise<SubscriptionResponse> {
  return json(BASE);
}

export function changePlan(plan: PlanTier): Promise<{ ok: boolean; msg: string }> {
  return json(`${BASE}/change`, { method: 'POST', body: JSON.stringify({ plan }) });
}

export function cancelPlanChange(): Promise<{ ok: boolean }> {
  return json(`${BASE}/cancel-change`, { method: 'POST', body: JSON.stringify({}) });
}

export function setAutoRenew(auto_renew: boolean): Promise<{ ok: boolean }> {
  return json(`${BASE}/auto-renew`, { method: 'PATCH', body: JSON.stringify({ auto_renew }) });
}
