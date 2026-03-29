import { useEffect, useRef, useCallback, useState } from 'react';

const SSE_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Hook for SSE (Server-Sent Events) based realtime signals.
 * Replaces polling with efficient push-based updates.
 * Auto-reconnects on disconnect. Pauses when page hidden.
 */
export function useSSESignals(
  commands: string[] = [],
  onSignal?: (data: any) => void,
) {
  const esRef = useRef<EventSource | null>(null);
  const attemptsRef = useRef(0);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const params = commands.length ? `?commands=${commands.join(',')}` : '';
    const es = new EventSource(`/api/v1/sse/signals${params}`, {
      withCredentials: true,
    });

    es.addEventListener('signals', (event) => {
      try {
        const data = JSON.parse(event.data);
        onSignal?.(data);
      } catch {
        // Malformed event
      }
    });

    es.onopen = () => {
      setConnected(true);
      attemptsRef.current = 0;
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;

      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current++;
        setTimeout(connect, SSE_RECONNECT_DELAY * attemptsRef.current);
      }
    };

    esRef.current = es;
  }, [commands.join(','), onSignal]);

  useEffect(() => {
    connect();

    const onVisibility = () => {
      if (document.hidden) {
        esRef.current?.close();
        esRef.current = null;
        setConnected(false);
      } else {
        attemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      esRef.current?.close();
      esRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connect]);

  return { connected };
}
