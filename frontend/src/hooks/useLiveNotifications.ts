import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '../stores/notifications';
import { triggerIsland } from '../components/ui/NotificationIsland';
import type { NotificationItem } from '../services/notificationsApi';

const POLL_FAST = 12_000;
const POLL_SLOW = 40_000;

/**
 * Live notification detection hook.
 * Polls for unread count and triggers island/toast when new notifications arrive.
 * Visibility-aware: pauses when tab is hidden, resumes immediately on focus.
 */
export function useLiveNotifications(isActivePage = false) {
  const refreshCount = useNotificationsStore((s) => s.refreshCount);
  const softRefresh = useNotificationsStore((s) => s.softRefresh);
  const prevCountRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    // Initialize with current count
    const currentCount = useNotificationsStore.getState().unreadCount;
    prevCountRef.current = currentCount;
  }, []);

  useEffect(() => {
    const interval = isActivePage ? POLL_FAST : POLL_SLOW;

    const poll = async () => {
      if (document.hidden) return;

      await refreshCount();
      const state = useNotificationsStore.getState();
      const newCount = state.unreadCount;
      const prevCount = prevCountRef.current ?? 0;

      if (newCount > prevCount && state.loaded) {
        // Fetch new items
        await softRefresh();
        const updated = useNotificationsStore.getState();
        // Get the newly arrived notifications (items not yet seen)
        const newItems = updated.notifications
          .filter((n: NotificationItem) => !n.read && n.createdAt > Date.now() - 60_000)
          .slice(0, newCount - prevCount);

        if (newItems.length > 0) {
          triggerIsland(newItems);

          // Delight moments for special notifications
          const hasAchievement = newItems.some((n: NotificationItem) => n.type === 'achievement_unlocked');
          const hasLevelUp = newItems.some((n: NotificationItem) => n.type === 'user_level_up');
          if (hasAchievement || hasLevelUp) {
            import('../lib/delight').then(({ celebrateConfetti, delightHaptic }) => {
              celebrateConfetti();
              if (hasLevelUp) delightHaptic.levelUp();
              else delightHaptic.achievement();
            });
          } else {
            const hasHigh = newItems.some((n: NotificationItem) => n.priority === 'high');
            if (hasHigh) {
              import('../lib/delight').then(({ delightHaptic }) => delightHaptic.success());
            }
          }
        }
      }

      prevCountRef.current = newCount;
    };

    intervalRef.current = setInterval(poll, interval);

    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isActivePage, refreshCount, softRefresh]);
}
