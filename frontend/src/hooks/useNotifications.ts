import { useEffect, useRef, useCallback } from 'react';
import { useNotificationsStore } from '../stores/notifications';

const POLL_FAST = 15_000;  // 15s when on notifications page
const POLL_SLOW = 45_000;  // 45s background polling

/**
 * Hook with visibility-aware smart polling.
 * - Pauses when tab is hidden
 * - Polls faster when on the notifications page
 * - Soft-refreshes the list when new notifications are detected
 */
export function useNotifications(isActive = false) {
  const store = useNotificationsStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const prevCountRef = useRef(store.unreadCount);

  // Initial load
  useEffect(() => {
    if (!store.loaded && !store.loading) {
      store.load();
    }
  }, [store.loaded, store.loading]);

  // Smart polling with visibility awareness
  useEffect(() => {
    const interval = isActive ? POLL_FAST : POLL_SLOW;

    const poll = async () => {
      if (document.hidden) return;
      const prevCount = prevCountRef.current;
      await store.refreshCount();
      const newCount = useNotificationsStore.getState().unreadCount;
      // If new notifications arrived, soft-refresh the list
      if (newCount > prevCount && useNotificationsStore.getState().loaded) {
        store.softRefresh();
      }
      prevCountRef.current = newCount;
    };

    intervalRef.current = setInterval(poll, interval);

    // Also poll immediately when tab becomes visible
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isActive]);

  // Keep prevCountRef in sync
  useEffect(() => {
    prevCountRef.current = store.unreadCount;
  }, [store.unreadCount]);

  const reload = useCallback(() => {
    store.reset();
    store.load();
  }, []);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    total: store.total,
    page: store.page,
    totalPages: store.totalPages,
    loading: store.loading,
    loadingMore: store.loadingMore,
    error: store.error,
    loaded: store.loaded,

    markRead: store.markRead,
    markAllRead: store.markAllRead,
    deleteItem: store.deleteItem,
    loadMore: store.loadMore,
    reload,
    refreshCount: store.refreshCount,
  };
}
