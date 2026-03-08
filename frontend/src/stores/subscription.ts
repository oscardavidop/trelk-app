import { create } from 'zustand';
import {
  fetchSubscription,
  changePlan as apiChangePlan,
  cancelPlanChange as apiCancelChange,
  setAutoRenew as apiAutoRenew,
  type ProFeatures,
  type PlanTier,
} from '../services/subscriptionApi';

interface SubscriptionState {
  features: ProFeatures | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  changePlan: (plan: PlanTier) => Promise<void>;
  cancelChange: () => Promise<void>;
  toggleAutoRenew: (value: boolean) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  features: null,
  loading: false,
  error: null,

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
    // Reload full state from server after change
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
}));
