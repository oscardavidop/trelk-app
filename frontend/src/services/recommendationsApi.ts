const BASE = '/api/v1/ui/recommendations';

async function json<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface RecommendationItem {
  command: string;
  score: number;
  reason: 'category' | 'co_usage' | 'popular' | 'trending';
  category?: string;
  rating?: number;
  ratingsCount?: number;
  weeklyUses?: number;
}

export async function fetchRecommendations(limit = 10): Promise<RecommendationItem[]> {
  const res = await json<{ ok: boolean; data: RecommendationItem[] }>(`${BASE}?limit=${limit}`);
  return res.data ?? [];
}
