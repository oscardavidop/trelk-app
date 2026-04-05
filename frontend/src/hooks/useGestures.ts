import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from './useTelegram';

interface SwipeBackOptions {
  /** Minimum horizontal swipe distance in px (default: 80) */
  threshold?: number;
  /** Maximum vertical movement allowed in px (default: 60) */
  maxVertical?: number;
  /** Edge zone width in px — only trigger from left edge (default: 30) */
  edgeWidth?: number;
  /** Whether swipe-back is enabled (default: true) */
  enabled?: boolean;
}

/**
 * useSwipeBack — native-feeling swipe-to-go-back gesture.
 *
 * Only activates when the touch starts from the left edge.
 * Provides haptic feedback on threshold cross.
 *
 * Usage:
 *   useSwipeBack(); // attach to root container
 */
export function useSwipeBack(options: SwipeBackOptions = {}) {
  const {
    threshold = 80,
    maxVertical = 60,
    edgeWidth = 30,
    enabled = true,
  } = options;

  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const startX = useRef(0);
  const startY = useRef(0);
  const triggered = useRef(false);
  const fromEdge = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      triggered.current = false;
      fromEdge.current = touch.clientX <= edgeWidth;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!fromEdge.current || triggered.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      if (dy > maxVertical) {
        fromEdge.current = false;
        return;
      }

      if (dx >= threshold) {
        triggered.current = true;
        haptic?.impactOccurred('light');
        navigate(-1);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [enabled, threshold, maxVertical, edgeWidth, navigate, haptic]);
}

/**
 * useHapticTap — consistent haptic feedback for tap interactions.
 *
 * Returns a wrapped onClick that fires haptic before the original handler.
 */
export function useHapticTap(style: 'light' | 'medium' | 'heavy' = 'light') {
  const { haptic } = useTelegram();

  return useCallback(
    <T extends (...args: any[]) => void>(handler?: T) => {
      return (...args: Parameters<T>) => {
        haptic?.impactOccurred(style);
        handler?.(...args);
      };
    },
    [haptic, style],
  );
}

/**
 * Safe area CSS custom properties.
 * Use in Tailwind: `pb-[env(safe-area-inset-bottom)]`
 * Or use these constants for calculations.
 */
export const SAFE_AREAS = {
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
} as const;
