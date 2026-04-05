import { create } from 'zustand';
import {
  fetchAlerts,
  fetchAlert,
  deleteAlert as apiDeleteAlert,
  deleteAllAlerts as apiDeleteAllAlerts,
  type AlertItem,
} from '../services/alertsApi';

type Filter = 'all' | 'today' | 'upcoming';

interface AlertsState {
  items: AlertItem[];
  loading: boolean;
  error: string | null;
  filter: Filter;
  selectedAlert: AlertItem | null;
  detailLoading: boolean;

  load: () => Promise<void>;
  setFilter: (f: Filter) => void;
  deleteOne: (id: string) => Promise<void>;
  deleteAll: () => Promise<number>;
  openDetail: (id: string) => Promise<void>;
  closeDetail: () => void;
  tick: () => void;
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isTomorrow(ts: number): boolean {
  const d = new Date(ts);
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate();
}

export type DateGroup = 'overdue' | 'today' | 'tomorrow' | 'upcoming';

export function getDateGroup(item: AlertItem): DateGroup {
  if (item.status === 'expired') return 'overdue';
  if (isToday(item.runAt)) return 'today';
  if (isTomorrow(item.runAt)) return 'tomorrow';
  return 'upcoming';
}

export function groupAlerts(items: AlertItem[], filter: Filter): { label: DateGroup; items: AlertItem[] }[] {
  let filtered = items;
  if (filter === 'today') {
    filtered = items.filter((a) => isToday(a.runAt));
  } else if (filter === 'upcoming') {
    filtered = items.filter((a) => a.status === 'scheduled');
  }

  const groups: Map<DateGroup, AlertItem[]> = new Map();
  const order: DateGroup[] = ['overdue', 'today', 'tomorrow', 'upcoming'];

  for (const item of filtered) {
    const g = getDateGroup(item);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(item);
  }

  return order.filter((g) => groups.has(g)).map((g) => ({ label: g, items: groups.get(g)! }));
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filter: 'all',
  selectedAlert: null,
  detailLoading: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const items = await fetchAlerts();
      set({ items, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setFilter: (filter) => set({ filter }),

  deleteOne: async (id) => {
    await apiDeleteAlert(id);
    set((s) => ({ items: s.items.filter((a) => a.id !== id) }));
  },

  deleteAll: async () => {
    const count = await apiDeleteAllAlerts();
    set({ items: [] });
    return count;
  },

  openDetail: async (id) => {
    const existing = get().items.find((a) => a.id === id);
    if (existing) {
      set({ selectedAlert: existing, detailLoading: false });
      return;
    }
    set({ detailLoading: true });
    try {
      const alert = await fetchAlert(id);
      set({ selectedAlert: alert, detailLoading: false });
    } catch {
      set({ detailLoading: false });
    }
  },

  closeDetail: () => set({ selectedAlert: null }),

  tick: () => {
    const now = Date.now();
    set((s) => ({
      items: s.items.map((a) => ({
        ...a,
        secondsLeft: Math.max(0, Math.floor((a.runAt - now) / 1000)),
        status: a.runAt > now ? 'scheduled' : 'expired',
      })),
      selectedAlert: s.selectedAlert
        ? {
            ...s.selectedAlert,
            secondsLeft: Math.max(0, Math.floor((s.selectedAlert.runAt - now) / 1000)),
            status: s.selectedAlert.runAt > now ? 'scheduled' : 'expired',
          }
        : null,
    }));
  },
}));
