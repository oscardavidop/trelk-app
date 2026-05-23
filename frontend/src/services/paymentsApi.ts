import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/payments';

async function json<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((opts.headers as Record<string, string>) || {}),
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

export interface SubscriptionItem {
  _id: string;
  paypal_subscription_id: string;
  status: string;
  plan_id: string;
  amount: number;
  currency: string;
  provider?: 'paypal' | 'telegram_stars' | 'telegram_card';
  telegram_charge_id?: string | null;
  next_billing_date: string | null;
  start_time: string;
  paypal_payerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInfo {
  outstanding_balance?: { currency_code: string; value: string };
  last_payment?: { amount: { currency_code: string; value: string }; time: string };
  next_billing_time?: string;
  failed_payments_count?: number;
  cycle_executions?: any[];
}

export interface EventResource {
  id?: string;
  status?: string;
  state?: string;
  plan_id?: string;
  start_time?: string;
  status_update_time?: string;
  billing_agreement_id?: string;
  amount?: { total: string; currency: string; details?: any };
  transaction_fee?: { currency: string; value: string };
  payment_mode?: string;
  create_time?: string;
}

export interface PaymentEventItem {
  _id: string;
  event_id: string;
  eventType: string;
  subscriptionId: string;
  processed: boolean;
  invalid_signature: boolean;
  createdAt: string;
  create_time: string;
  summary: string;
  resource?: EventResource;
  billing_info?: BillingInfo;
  subscriber?: { name?: { given_name: string; surname: string }; payer_id: string; email: string };
}

export interface SpentSummary {
  currency: string;
  total: number;
  count: number;
}

export interface PaymentsSummary {
  ok: boolean;
  activeSubscription: SubscriptionItem | null;
  totalSubscriptions: number;
  totalSpent: SpentSummary[];
}

export interface PaginatedResponse<T> {
  ok: boolean;
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── API Functions ────────────────────────────────

export function fetchSummary(): Promise<PaymentsSummary> {
  return json(`${BASE}/summary`);
}

export function fetchSubscriptions(cursor?: string, limit = 20): Promise<PaginatedResponse<SubscriptionItem>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  return json(`${BASE}/subscriptions?${params}`);
}

export function fetchSubscriptionDetail(id: string): Promise<{ ok: boolean; subscription: SubscriptionItem }> {
  return json(`${BASE}/subscriptions/${encodeURIComponent(id)}`);
}

export function fetchSubscriptionEvents(id: string): Promise<{ ok: boolean; events: PaymentEventItem[] }> {
  return json(`${BASE}/subscriptions/${encodeURIComponent(id)}/events`);
}

export function fetchHistory(cursor?: string, limit = 20, eventType?: string): Promise<PaginatedResponse<PaymentEventItem>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  if (eventType) params.set('eventType', eventType);
  return json(`${BASE}/history?${params}`);
}

export function cancelSubscription(id: string): Promise<{ ok: boolean; message: string }> {
  return json(`${BASE}/subscriptions/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
