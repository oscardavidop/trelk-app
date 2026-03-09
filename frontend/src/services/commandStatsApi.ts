const BASE = '/api/v1/ui/commands';

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────

export interface CommandStatsData {
  rating: number;
  ratingsCount: number;
  weeklyUses: number;
  favorites: number;
}

export interface MyRating {
  rating: number | null;
  review: string | null;
}

export interface Review {
  userId: number;
  rating: number;
  review: string;
  updatedAt: number;
}

export interface ReviewsPage {
  items: Review[];
  total: number;
}

// ── API calls ────────────────────────────────────

export function fetchCommandStats(command: string): Promise<CommandStatsData> {
  return json(`${BASE}/${encodeURIComponent(command)}/stats`);
}

export function fetchMyRating(command: string): Promise<MyRating> {
  return json(`${BASE}/${encodeURIComponent(command)}/my-rating`);
}

export function submitRating(command: string, rating: number, review?: string): Promise<void> {
  return json(`${BASE}/${encodeURIComponent(command)}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, ...(review ? { review } : {}) }),
  });
}

export function fetchReviews(command: string, limit = 10, offset = 0): Promise<ReviewsPage> {
  return json(`${BASE}/${encodeURIComponent(command)}/reviews?limit=${limit}&offset=${offset}`);
}

export function submitReport(
  command: string,
  category: string,
  message: string,
): Promise<void> {
  return json(`${BASE}/${encodeURIComponent(command)}/report`, {
    method: 'POST',
    body: JSON.stringify({ category, message }),
  });
}
