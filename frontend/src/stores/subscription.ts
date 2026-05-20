import { create } from 'zustand';
import {
  fetchSubscription,
  fetchRealStatus,
  fetchPlans,
  startCheckout,
  reviseSubscription as apiRevise,
  cancelRealSubscription,
  resumeRealSubscription,
  changePlan as apiChangePlan,
  cancelPlanChange as apiCancelChange,
  setAutoRenew as apiAutoRenew,
  type ProFeatures,
  type PlanTier,
  type RealSubStatus,
  type RealSubscription,
  type PayPalPlan,
  type ReviseResponse,
} from '../services/subscriptionApi';

const PENDING_SUB_KEY = 'trelk:pendingSubscription';

interface SubscriptionState {
  // ── Local pro_features ──────────────────────────
  features: ProFeatures | null;
  loading: boolean;
  error: string | null;

  // ── Real PayPal status ──────────────────────────
  realStatus: RealSubStatus;
  realSub: RealSubscription | null;
  isPremium: boolean;
  realLoading: boolean;

  // ── Available plans ────────────────────────────
  plans: PayPalPlan[];
  plansLoading: boolean;

  // ── Checkout / Revise loading ──────────────────
  actionLoading: boolean;

  // ── Pending (waiting for webhook) ─────────────
  pendingSubscriptionId: string | null;
  pollInterval: ReturnType<typeof setInterval> | null;

  // ── Actions (local) ────────────────────────────
  load: () => Promise<void>;
  changePlan: (plan: PlanTier) => Promise<void>;
  cancelChange: () => Promise<void>;
  toggleAutoRenew: (value: boolean) => Promise<void>;

  // ── Actions (real PayPal) ──────────────────────
  loadRealStatus: () => Promise<void>;
  loadPlans: () => Promise<void>;

  /** Inicia checkout para nuevo plan. Devuelve la approvalUrl. */
  checkout: (planId: string, returnUrl: string, cancelUrl: string) => Promise<string>;

  /** Cambia el plan de una suscripción activa. Devuelve ReviseResponse. */
  revise: (subscriptionId: string, newPlanId: string, returnUrl: string, cancelUrl: string) => Promise<ReviseResponse>;

  /** Cancela la suscripción activa en PayPal. */
  cancelReal: (subscriptionId: string) => Promise<void>;

  /** Reanuda una suscripción suspendida. */
  resume: (subscriptionId: string) => Promise<void>;

  /** Inicia polling hasta que status sea ACTIVE (máx. 60 intentos × 3s = 3 min). */
  startPolling: (subscriptionId: string) => void;

  /** Detiene el polling. */
  stopPolling: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  features: null,
  loading: false,
  error: null,

  realStatus: 'FREE',
  realSub: null,
  isPremium: false,
  realLoading: false,

  plans: [],
  plansLoading: false,

  actionLoading: false,

  pendingSubscriptionId: localStorage.getItem(PENDING_SUB_KEY),
  pollInterval: null,

  // ── Local load ──────────────────────────────────────────────────────────

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSubscription();
      if (res.ok) {
        set({ features: res.pro_features, loading: false });
      } else {
        set({ error: 'Failed to load', loading: false });
      }
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  changePlan: async (plan) => {
    await apiChangePlan(plan);
    await get().load();
  },

  cancelChange: async () => {
    await apiCancelChange();
    await get().load();
  },

  toggleAutoRenew: async (value) => {
    await apiAutoRenew(value);
    set((s) => {
      if (!s.features) return s;
      return {
        features: {
          ...s.features,
          subscription: { ...s.features.subscription, auto_renew: value },
        },
      };
    });
  },

  // ── Real PayPal status ──────────────────────────────────────────────────

  loadRealStatus: async () => {
    set({ realLoading: true });
    try {
      const res = await fetchRealStatus();
      set({
        realStatus: res.status,
        realSub: res.subscription,
        isPremium: res.isPremium,
        realLoading: false,
      });
    } catch {
      set({ realLoading: false });
    }
  },

  loadPlans: async () => {
    set({ plansLoading: true });
    try {
      const res = await fetchPlans();
      set({ plans: res.plans ?? [], plansLoading: false });
    } catch {
      set({ plansLoading: false });
    }
  },

  // ── Checkout ────────────────────────────────────────────────────────────

  checkout: async (planId, returnUrl, cancelUrl) => {
    set({ actionLoading: true });
    try {
      const res = await startCheckout(planId, returnUrl, cancelUrl);
      // Store pending sub so polling can pick it up when user returns
      localStorage.setItem(PENDING_SUB_KEY, res.subscriptionId);
      set({ pendingSubscriptionId: res.subscriptionId, actionLoading: false });
      return res.approvalUrl;
    } catch (e) {
      set({ actionLoading: false });
      throw e;
    }
  },

  // ── Revise ──────────────────────────────────────────────────────────────

  revise: async (subscriptionId, newPlanId, returnUrl, cancelUrl) => {
    set({ actionLoading: true });
    try {
      const res = await apiRevise(subscriptionId, newPlanId, returnUrl, cancelUrl);
      if (res.approvalUrl) {
        localStorage.setItem(PENDING_SUB_KEY, subscriptionId);
        set({ pendingSubscriptionId: subscriptionId });
      }
      set({ actionLoading: false });
      return res;
    } catch (e) {
      set({ actionLoading: false });
      throw e;
    }
  },

  // ── Cancel ──────────────────────────────────────────────────────────────

  cancelReal: async (subscriptionId) => {
    set({ actionLoading: true });
    try {
      await cancelRealSubscription(subscriptionId);
      set({ actionLoading: false });
      // Reload real status — backend now returns ACTIVE_CANCEL_SCHEDULED,
      // so the user keeps isPremium = true until period end.
      await get().loadRealStatus();
    } catch (e) {
      set({ actionLoading: false });
      throw e;
    }
  },

  // ── Resume ──────────────────────────────────────────────────────────────

  resume: async (subscriptionId) => {
    set({ actionLoading: true });
    try {
      await resumeRealSubscription(subscriptionId);
      set({ actionLoading: false });
      await get().loadRealStatus();
      await get().load();
    } catch (e) {
      set({ actionLoading: false });
      throw e;
    }
  },

  // ── Polling (wait for webhook activation) ──────────────────────────────

  startPolling: (subscriptionId: string) => {
    const existing = get().pollInterval;
    if (existing) clearInterval(existing);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetchRealStatus();
        set({ realStatus: res.status, realSub: res.subscription, isPremium: res.isPremium });

        if (res.status === 'ACTIVE') {
          clearInterval(interval);
          set({ pollInterval: null, pendingSubscriptionId: null });
          localStorage.removeItem(PENDING_SUB_KEY);
          // Reload local features too (plan tier may have changed)
          await get().load();
        }
      } catch { /* ignore poll errors */ }

      if (attempts >= 60) {
        clearInterval(interval);
        set({ pollInterval: null });
      }
    }, 3000);

    set({ pollInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollInterval;
    if (interval) clearInterval(interval);
    set({ pollInterval: null });
  },
}));
