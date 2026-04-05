import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/analytics';

let buffer: { event: string; properties?: Record<string, any> }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = '';

function getSessionId(): string {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('analytics_sid') || crypto.randomUUID();
    sessionStorage.setItem('analytics_sid', sessionId);
  }
  return sessionId;
}

/** Track a single event (buffered, non-blocking) */
export function track(event: string, properties?: Record<string, any>): void {
  buffer.push({ event, properties });

  if (!flushTimer) {
    flushTimer = setTimeout(flush, 3000); // flush every 3s
  }
}

/** Flush buffered events to server */
async function flush(): Promise<void> {
  flushTimer = null;
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);
  try {
    await authFetch(`${BASE}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // Re-queue failed events (max 100)
    buffer.push(...batch.slice(0, 100 - buffer.length));
  }
}

// Convenience helpers
export function trackPageView(page: string): void {
  track('page_view', { page });
}

export function trackSearch(query: string, resultsCount: number): void {
  track('search', { query, resultsCount });
}

export function trackCommandClick(command: string, source: string): void {
  track('command_click', { command, source });
}

export function trackDeepLink(startParam: string, resolvedRoute: string): void {
  track('deep_link', { startParam, resolvedRoute });
}

export function trackPinVerify(success: boolean): void {
  track('pin_verify', { success });
}

// Flush on page hide (mobile browsers)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
