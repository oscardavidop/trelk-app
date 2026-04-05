import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/command-favorites';

// ── Types ──────────────────────────────────────────

export interface CommandFavoriteItem {
  command: string;
  pinned: boolean;
  createdAt: number;
}

export interface CommandFavoritesResponse {
  ok: boolean;
  items: CommandFavoriteItem[];
  hasMore: boolean;
  nextOffset: number;
  total?: number;
}

export interface TrendingCommand {
  command: string;
  count: number;
}

// ── API calls ──────────────────────────────────────

export async function fetchCommandFavorites(
  offset = 0,
  limit = 50,
  search?: string,
): Promise<CommandFavoritesResponse> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (search) params.set('search', search);
  const res = await authFetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`command-favorites ${res.status}`);
  return res.json();
}

/** Get all favorite command names (for quick isFavorite checks) */
export async function fetchFavoriteSet(): Promise<string[]> {
  const res = await authFetch(`${BASE}/set`);
  if (!res.ok) throw new Error(`command-favorites set ${res.status}`);
  const data = await res.json();
  return data.commands;
}

/** Toggle favorite (add/remove) */    
export async function toggleCommandFavorite(command: string): Promise<{ added: boolean }> {
  const res = await authFetch(`${BASE}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error(`toggle favorite ${res.status}`);
  const data = await res.json();
  return { added: data.added };
}

/** Remove a favorite */
export async function removeCommandFavorite(command: string): Promise<void> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(command)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`remove favorite ${res.status}`);
}

/** Toggle pin on a favorite */
export async function togglePinCommand(command: string): Promise<{ pinned: boolean }> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(command)}/pin`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`toggle pin ${res.status}`);
  const data = await res.json();
  return { pinned: data.pinned };
}

/** Trending commands (most favorited this week) */
export async function fetchTrending(limit = 10): Promise<TrendingCommand[]> {
  const res = await authFetch(`${BASE}/trending?limit=${limit}`);
  if (!res.ok) throw new Error(`trending ${res.status}`);
  const data = await res.json();
  return data.items;
}

/** Most favorited commands overall */
export async function fetchMostFavorited(limit = 10): Promise<TrendingCommand[]> {
  const res = await authFetch(`${BASE}/most-favorited?limit=${limit}`);
  if (!res.ok) throw new Error(`most-favorited ${res.status}`);
  const data = await res.json();
  return data.items;
}
