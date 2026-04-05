import { useEffect, useRef } from 'react';
import { useSecurityStore } from '../stores/security';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Monitors user activity and auto-locks the app after `lockAfterMinutes`
 * of inactivity when PIN is enabled and verified.
 */
export function useAutoLock() {
  const { pinEnabled, verified, lockAfterMinutes, setVerified } = useSecurityStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!pinEnabled || !verified || lockAfterMinutes <= 0) return;

    const timeoutMs = lockAfterMinutes * 60_000;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Lock the app by un-verifying
        setVerified(false);
      }, timeoutMs);
    };

    // Start timer
    resetTimer();

    // Reset on any activity
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [pinEnabled, verified, lockAfterMinutes, setVerified]);
}
