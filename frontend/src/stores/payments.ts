import { create } from 'zustand';
import {
  fetchSummary,
  fetchSubscriptions,
  fetchSubscriptionEvents,
  fetchHistory,
  type SubscriptionItem,
  type PaymentEventItem,
  type SpentSummary,
} from '../services/paymentsApi';
import { cancelRealSubscription } from '../services/subscriptionApi';

interface PaymentsState {
  // Summary
  activeSubscription: SubscriptionItem | null;
  totalSubscriptions: number;
  totalSpent: SpentSummary[];

  // Subscriptions list
  subscriptions: SubscriptionItem[];
  subsNextCursor: string | null;
  subsHasMore: boolean;

  // Events for selected subscription
  selectedSubId: string | null;
  events: PaymentEventItem[];

  // History
  history: PaymentEventItem[];
  historyNextCursor: string | null;
  historyHasMore: boolean;
  historyFilter: string;

  // UI state
  loading: boolean;
  loadingMore: boolean;
  eventsLoading: boolean;
  cancelling: boolean;
  error: string | null;
  activeTab: 'overview' | 'history' | 'subscriptions';
  detailEvent: PaymentEventItem | null;

  // Actions
  loadSummary: () => Promise<void>;
  loadSubscriptions: () => Promise<void>;
  loadMoreSubscriptions: () => Promise<void>;
  loadEvents: (subscriptionId: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  setHistoryFilter: (type: string) => void;
  setActiveTab: (tab: 'overview' | 'history' | 'subscriptions') => void;
  setDetailEvent: (event: PaymentEventItem | null) => void;
  setSelectedSubId: (id: string | null) => void;
  cancel: (subscriptionId: string) => Promise<void>;
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  activeSubscription: null,
  totalSubscriptions: 0,
  totalSpent: [],
  subscriptions: [],
  subsNextCursor: null,
  subsHasMore: false,
  selectedSubId: null,
  events: [],
  history: [],
  historyNextCursor: null,
  historyHasMore: false,
  historyFilter: '',
  loading: false,
  loadingMore: false,
  eventsLoading: false,
  cancelling: false,
  error: null,
  activeTab: 'overview',
  detailEvent: null,

  loadSummary: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchSummary();
      set({
        activeSubscription: data.activeSubscription,
        totalSubscriptions: data.totalSubscriptions,
        totalSpent: data.totalSpent,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchSubscriptions();
      set({
        subscriptions: data.items,
        subsNextCursor: data.nextCursor,
        subsHasMore: data.hasMore,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadMoreSubscriptions: async () => {
    const { subsNextCursor, subsHasMore, loadingMore } = get();
    if (!subsHasMore || loadingMore) return;
    set({ loadingMore: true });
    try {
      const data = await fetchSubscriptions(subsNextCursor || undefined);
      set((s) => ({
        subscriptions: [...s.subscriptions, ...data.items],
        subsNextCursor: data.nextCursor,
        subsHasMore: data.hasMore,
        loadingMore: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loadingMore: false });
    }
  },

  loadEvents: async (subscriptionId: string) => {
    set({ eventsLoading: true, selectedSubId: subscriptionId, events: [] });
    try {
      const data = await fetchSubscriptionEvents(subscriptionId);
      set({ events: data.events, eventsLoading: false });
    } catch (e: any) {
      set({ error: e.message, eventsLoading: false });
    }
  },

  loadHistory: async () => {
    set({ loading: true, error: null });
    try {
      const { historyFilter } = get();
      const data = await fetchHistory(undefined, 20, historyFilter || undefined);
      set({
        history: data.items,
        historyNextCursor: data.nextCursor,
        historyHasMore: data.hasMore,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadMoreHistory: async () => {
    const { historyNextCursor, historyHasMore, loadingMore, historyFilter } = get();
    if (!historyHasMore || loadingMore) return;
    set({ loadingMore: true });
    try {
      const data = await fetchHistory(historyNextCursor || undefined, 20, historyFilter || undefined);
      set((s) => ({
        history: [...s.history, ...data.items],
        historyNextCursor: data.nextCursor,
        historyHasMore: data.hasMore,
        loadingMore: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loadingMore: false });
    }
  },

  setHistoryFilter: (type: string) => {
    set({ historyFilter: type, history: [], historyNextCursor: null, historyHasMore: false });
    get().loadHistory();
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setDetailEvent: (event) => set({ detailEvent: event }),
  setSelectedSubId: (id) => set({ selectedSubId: id }),

  cancel: async (subscriptionId: string) => {
    set({ cancelling: true });
    try {
      await cancelRealSubscription(subscriptionId);
      // Refresh summary after cancel
      await get().loadSummary();
      await get().loadSubscriptions();
      set({ cancelling: false });
    } catch (e: any) {
      set({ error: e.message, cancelling: false });
    }
  },
}));
