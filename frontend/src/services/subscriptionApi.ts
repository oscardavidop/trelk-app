import { authFetch } from '../lib/authFetch';

// REST JSON helpers for /api/v1/ui/subscription endpoints
const BASE = '/api/v1/ui/subscription';

async function json<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, {
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

// ── Types (local pro_features) ────────────────────────────────────────────
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

// ── Types (real PayPal) ───────────────────────────────────────────────────

export type RealSubStatus =
  | 'FREE'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PENDING';

export interface PayPalPlan {
  name: string;
  plan_id: string;
  price: number;
  currency: string;
  displayName: string;
}

export interface RealSubscription {
  id: string;
  plan_id: string;
  status: string;
  next_billing_date: string | null;
  amount: number | null;
  currency: string;
  start_time: string | null;
  cancelled_at: string | null;
}

export interface RealStatusResponse {
  ok: boolean;
  status: RealSubStatus;
  subscription: RealSubscription | null;
  isPremium: boolean;
}

export interface CheckoutResponse {
  ok: boolean;
  subscriptionId: string;
  approvalUrl: string;
}

export interface ReviseResponse {
  ok: boolean;
  approvalUrl: string | null;
  requiresApproval: boolean;
}

// ── Local subscription (pro_features) ────────────────────────────────────

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

// ── Plans (dynamic from backend) ─────────────────────────────────────────

export function fetchPlans(): Promise<{ ok: boolean; plans: PayPalPlan[] }> {
  return json(`${BASE}/plans`);
}

// ── Real PayPal status ────────────────────────────────────────────────────

export function fetchRealStatus(): Promise<RealStatusResponse> {
  return json(`${BASE}/status`);
}

// ── Checkout — new subscription ───────────────────────────────────────────

export function startCheckout(
  plan_id: string,
  return_url: string,
  cancel_url: string,
): Promise<CheckoutResponse> {
  return json(`${BASE}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ plan_id, return_url, cancel_url }),
  });
}

// ── Revise — upgrade / downgrade ─────────────────────────────────────────

export function reviseSubscription(
  subscription_id: string,
  new_plan_id: string,
  return_url: string,
  cancel_url: string,
): Promise<ReviseResponse> {
  return json(`${BASE}/revise`, {
    method: 'POST',
    body: JSON.stringify({ subscription_id, new_plan_id, return_url, cancel_url }),
  });
}

// ── Cancel real PayPal subscription ──────────────────────────────────────

export function cancelRealSubscription(subscription_id: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ subscription_id }),
  });
}

// ── Resume suspended subscription ────────────────────────────────────────

export function resumeRealSubscription(subscription_id: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/resume`, {
    method: 'POST',
    body: JSON.stringify({ subscription_id }),
  });
}
