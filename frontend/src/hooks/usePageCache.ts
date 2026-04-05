import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * usePageCache — cache page-level data to avoid loaders on back-navigation.
 *
 * On mount, checks if cached data exists → returns it instantly.
 * On unmount timer (short delay), the data persists in TanStack cache.
 *
 * This eliminates the loading flash when navigating back to previously visited pages.
 *
 * Usage:
 *   const { data, isLoading } = useQuery({ queryKey: ['page', id], queryFn: ... });
 *   // TanStack Query already caches, but combine with staleTime for instant nav:
 *   // staleTime: 2 * 60_000 → data is reused for 2 minutes without refetch
 */

/** Default stale times for common page types */
export const PAGE_CACHE_TIMES = {
  /** Detail pages: fresh for 30s */
  detail: 30_000,
  /** List pages: fresh for 60s */
  list: 60_000,
  /** Rarely changing data: fresh for 5min */
  static: 5 * 60_000,
  /** User-specific data: fresh for 2min */
  personalized: 2 * 60_000,
} as const;

/**
 * useScrollRestore — remember and restore scroll position per route.
 */
export function useScrollRestore(key: string) {
  const positionRef = useRef(0);

  const save = useCallback(() => {
    positionRef.current = window.scrollY;
    try {
      sessionStorage.setItem(`scroll:${key}`, String(window.scrollY));
    } catch { /* ignore */ }
  }, [key]);

  const restore = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(`scroll:${key}`);
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved) || 0));
      }
    } catch { /* ignore */ }
  }, [key]);

  return { save, restore };
}
