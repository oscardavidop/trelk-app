/**
 * commandFeedbackApi.ts
 *
 * Real API integration for the "Was this command useful?" feedback system.
 *
 * GET  /api/v1/ui/commands/:command/my-rating  — fetch existing feedback
 * POST /api/v1/ui/commands/:command/feedback   — submit new feedback
 */

const BASE = '/api/v1/ui/commands';

async function json<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedbackReason = 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing';

/**
 * Shape returned by GET /my-rating.
 * The `feedback` field ("useful" | "not_useful") is returned when the user
 * has previously submitted a useful/not-useful vote.
 * The numeric `rating` field is the star rating (1–5), also used as fallback.
 */
export interface MyFeedback {
  rating: number | null;
  review: string | null;
  feedback?: 'useful' | 'not_useful' | null;
}

export interface FeedbackPayload {
  useful: boolean;
  reason?: FeedbackReason;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's existing feedback for a command.
 * Returns null values if the user has not yet given feedback.
 */
export function fetchMyFeedback(command: string): Promise<MyFeedback> {
  return json<MyFeedback>(`${BASE}/${encodeURIComponent(command)}/my-rating`);
}

/**
 * Submit useful / not-useful feedback for a command.
 * POST /api/v1/ui/commands/:command/feedback
 * Body: { "useful": true } | { "useful": false, "reason": "too_slow" }
 */
export function submitFeedback(command: string, payload: FeedbackPayload): Promise<void> {
  return json<void>(`${BASE}/${encodeURIComponent(command)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
