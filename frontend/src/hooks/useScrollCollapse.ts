import { useEffect, useState, useRef, useCallback } from 'react';

export function useScrollCollapse(threshold = 80) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCollapsed(window.scrollY > threshold - 20);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return collapsed;
}

// cuando se llega al final de la página
export function useScrollEnd(){
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const threshold = document.documentElement.scrollHeight - 100; // 100px antes del final
      setAtEnd(scrollPosition >= threshold);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check on mount

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return atEnd;
}

/**
 * Like useScrollCollapse but with debouncing to reduce state updates during fast scrolling. Adjust debounceTime as needed.
 * @param threshold 
 * @param debounceTime 
 * @returns 
 */
export function useScrollCollapseDebounced(threshold = 80, debounceTime = 100) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setCollapsed(window.scrollY > threshold);
      }, debounceTime);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold, debounceTime]);

  return collapsed;
}


/**
 * Performance-optimized scroll header collapse.
 * Uses a ref to track collapse state and only triggers re-render when the value actually changes.
 * The rAF coalescing prevents multiple setState calls per frame.
 */
export function useScrollHeader(threshold = 100, margin = 30) {
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        let next = collapsedRef.current;

        if (!next && y > threshold) {
          next = true;
        } else if (next && y < threshold - margin) {
          next = false;
        }

        // Only call setState when value actually changes
        if (next !== collapsedRef.current) {
          collapsedRef.current = next;
          setCollapsed(next);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, margin]);

  return collapsed;
}


export function useScrollHeaderDebounced(threshold = 100, debounceTime = 100) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const isOverThreshold = window.scrollY > threshold;
        setCollapsed(prev => (prev !== isOverThreshold ? isOverThreshold : prev));
      }, debounceTime);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold, debounceTime]);

  return collapsed;
}