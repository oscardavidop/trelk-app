import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/search';

async function json<T = any>(url: string): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SearchResult {
  command: string;
  name: string;
  category: string;
  description: string;
  score: number;
  matchType: 'exact' | 'prefix' | 'contains' | 'alias' | 'fuzzy';
}

export interface SearchResponse {
  ok: boolean;
  results: SearchResult[];
  intent: { type: string; value?: string } | null;
  trending: string[];
}

export function searchCommands(query: string): Promise<SearchResponse> {
  return json<SearchResponse>(`${BASE}?q=${encodeURIComponent(query)}`);
}

export function fetchTrending(): Promise<{ ok: boolean; trending: string[] }> {
  return json(`${BASE}/trending`);
}

export function fetchRecentSearches(): Promise<{ ok: boolean; recent: string[] }> {
  return json(`${BASE}/recent`);
}
