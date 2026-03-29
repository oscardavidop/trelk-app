import { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualListOptions {
  /** Total number of items */
  totalItems: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Number of items to render above/below viewport */
  overscan?: number;
  /** Container height override (default: measured from ref) */
  containerHeight?: number;
}

interface VirtualListResult {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Range of visible items */
  visibleRange: { start: number; end: number };
  /** Total height for the spacer */
  totalHeight: number;
  /** Offset for the rendered slice */
  offsetY: number;
  /** Items to render (indices) */
  visibleIndices: number[];
}

/**
 * Lightweight virtual list hook for rendering large lists efficiently.
 * Only renders items visible in the viewport + overscan buffer.
 *
 * Usage:
 * ```tsx
 * const { containerRef, visibleIndices, totalHeight, offsetY } = useVirtualList({
 *   totalItems: items.length,
 *   itemHeight: 80,
 * });
 *
 * return (
 *   <div ref={containerRef} style={{ height: 500, overflow: 'auto' }}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       <div style={{ transform: `translateY(${offsetY}px)` }}>
 *         {visibleIndices.map(i => <ItemCard key={i} data={items[i]} />)}
 *       </div>
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualList(options: VirtualListOptions): VirtualListResult {
  const { totalItems, itemHeight, overscan = 5, containerHeight: fixedHeight } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(fixedHeight || 500);

  useEffect(() => {
    if (fixedHeight) {
      setMeasuredHeight(fixedHeight);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setMeasuredHeight(entry.contentRect.height);
    });
    observer.observe(node);
    setMeasuredHeight(node.clientHeight);

    return () => observer.disconnect();
  }, [fixedHeight]);

  const handleScroll = useCallback(() => {
    const node = containerRef.current;
    if (node) setScrollTop(node.scrollTop);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const totalHeight = totalItems * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + measuredHeight) / itemHeight) + overscan,
  );

  const visibleIndices: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleIndices.push(i);
  }

  return {
    containerRef,
    visibleRange: { start: startIndex, end: endIndex },
    totalHeight,
    offsetY: startIndex * itemHeight,
    visibleIndices,
  };
}
