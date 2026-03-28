import { create } from 'zustand';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '../services/notificationsApi';

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshCount: () => Promise<void>;
  softRefresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  loadingMore: false,
  error: null,
  loaded: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [listRes, countRes] = await Promise.all([
        fetchNotifications(1, 20),
        fetchUnreadCount(),
      ]);
      set({
        notifications: listRes.items,
        total: listRes.total,
        page: listRes.page,
        totalPages: listRes.totalPages,
        unreadCount: countRes.count,
        loaded: true,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { page, totalPages, loadingMore, notifications } = get();
    if (loadingMore || page >= totalPages) return;
    set({ loadingMore: true });
    try {
      const res = await fetchNotifications(page + 1, 20);
      set({
        notifications: [...notifications, ...res.items],
        page: res.page,
        totalPages: res.totalPages,
        total: res.total,
      });
    } catch {
      // keep current state
    } finally {
      set({ loadingMore: false });
    }
  },

  refreshCount: async () => {
    try {
      const res = await fetchUnreadCount();
      set({ unreadCount: res.count });
    } catch {
      // silent
    }
  },

  softRefresh: async () => {
    // Fetch page 1 and merge new items at the top without clearing the list
    try {
      const res = await fetchNotifications(1, 20);
      const { notifications: current } = get();
      const existingIds = new Set(current.map((n) => n._id));
      const newItems = res.items.filter((n) => !existingIds.has(n._id));
      if (newItems.length > 0) {
        set({
          notifications: [...newItems, ...current],
          total: res.total,
          totalPages: res.totalPages,
        });
      }
    } catch {
      // silent
    }
  },

  markRead: async (id: string) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, read: true, readAt: Date.now() } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on error — reload next time
    }
  },

  markAllRead: async () => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt || Date.now(),
      })),
      unreadCount: 0,
    }));
    try {
      await markAllNotificationsRead();
    } catch {
      // Revert on error — reload next time
    }
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
      page: 1,
      totalPages: 1,
      loading: false,
      loadingMore: false,
      error: null,
      loaded: false,
    }),
}));
