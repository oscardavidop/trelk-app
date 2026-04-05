import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

interface PrefetchConfig {
  queryKey: QueryKey;
  queryFn: () => Promise<unknown>;
  staleTime?: number;
}

/**
 * usePrefetch — eagerly prefetch data before the user navigates.
 *
 * Call `prefetch()` on hover/focus/intersection to warm the cache.
 * Data will be instantly available when the user navigates.
 *
 * Usage:
 *   const { prefetch, ref } = usePrefetch({
 *     queryKey: ['command', slug],
 *     queryFn: () => fetchCommandDetail(slug),
 *   });
 *
 *   <Link onMouseEnter={prefetch} ref={ref}>...</Link>
 */
export function usePrefetch(config: PrefetchConfig) {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    queryClient.prefetchQuery({
      queryKey: config.queryKey,
      queryFn: config.queryFn,
      staleTime: config.staleTime ?? 60_000,
    });
  }, [queryClient, config.queryKey, config.queryFn, config.staleTime]);

  // Reset on queryKey change
  useEffect(() => {
    prefetched.current = false;
  }, [JSON.stringify(config.queryKey)]);

  return { prefetch };
}

/**
 * usePrefetchOnVisible — prefetch when element enters viewport.
 * Uses IntersectionObserver for zero-effort prefetching.
 */
export function usePrefetchOnVisible(config: PrefetchConfig) {
  const { prefetch } = usePrefetch(config);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prefetch();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefetch]);

  return { ref };
}
