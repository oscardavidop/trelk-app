import { authFetch } from '../lib/authFetch';

const BASE = import.meta.env.VITE_API_URL || 'https://api-telegram-prod.trelkbot.com';

async function json<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...((opts.headers as Record<string, string>) || {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size: number;
}

export interface FavoriteData {
  media_type?: string;
  service?: string;
  caption?: string;
  title?: string;
  photo?: PhotoSize[];
  [key: string]: any;
}

export interface FavoriteItem {
  _id: string;
  context: string;
  engine: string;
  engine_id: string;
  userId: number;
  data: FavoriteData;
  collectionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  _id: string;
  userId: number;
  name: string;
  count: number;
  createdAt: string;
}

export interface PaginatedResponse {
  ok: boolean;
  items: FavoriteItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface FiltersResponse {
  ok: boolean;
  contexts: string[];
  engines: string[];
}

export type ViewMode = 'gallery' | 'list' | 'compact';

// ── API ──────────────────────────────────────────

export const fetchFavorites = (p: {
  cursor?: string; limit?: number; context?: string; engine?: string; search?: string; collectionId?: string; 
  filters?: { projections?: string | string[] };  
}): Promise<PaginatedResponse> => {
  const q = new URLSearchParams();
  if (p.cursor) q.set('cursor', p.cursor);
  if (p.limit) q.set('limit', String(p.limit));
  if (p.context) q.set('context', p.context);
  if (p.engine) q.set('engine', p.engine);
  if (p.search) q.set('search', p.search);
  if (p.collectionId) q.set('collectionId', p.collectionId);
  if (p.filters?.projections) {
    const projections = Array.isArray(p.filters.projections) ? p.filters.projections.join(',') : p.filters.projections;
    q.set('projections', projections);
  }
  const qs = q.toString();
  return json(`${BASE}${qs ? `?${qs}` : ''}`);
};

export const fetchFilters = (): Promise<FiltersResponse> => json(`${BASE}/filters`);
export const fetchRandom = (limit = 10): Promise<{ ok: boolean; items: FavoriteItem[] }> => json(`${BASE}/random?limit=${limit}`);
export const deleteFavorite = (id: string): Promise<{ ok: boolean; status: string; expiresAt: number; jobId: string }> => json(`${BASE}/${id}`, { method: 'DELETE' });
export const batchDeleteFavorites = (ids: string[]): Promise<{ ok: boolean; status: string; expiresAt: number; jobId: string; count: number }> =>
  json(`${BASE}/batch-delete`, { method: 'POST', body: JSON.stringify({ ids }) });
export const undoDeleteFavorites = (ids: string[]): Promise<{ ok: boolean; restored: number }> =>
  json(`${BASE}/undo`, { method: 'POST', body: JSON.stringify({ ids }) });
export const moveFavorites = (ids: string[], collectionId: string | null): Promise<{ ok: boolean }> =>
  json(`${BASE}/move`, { method: 'PATCH', body: JSON.stringify({ ids, collectionId }) });

// Collections
export const fetchCollections = (): Promise<{ ok: boolean; items: Collection[] }> => json(`${BASE}/collections`);
export const createCollection = (name: string): Promise<{ ok: boolean; item: Collection }> =>
  json(`${BASE}/collections`, { method: 'POST', body: JSON.stringify({ name }) });
export const updateCollection = (id: string, name: string): Promise<{ ok: boolean; item: Collection }> =>
  json(`${BASE}/collections/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
export const deleteCollection = (id: string): Promise<{ ok: boolean }> =>
  json(`${BASE}/collections/${id}`, { method: 'DELETE' });

// File URL — includes token as query param so <img src> can authenticate
import { getSessionToken } from '../lib/authFetch';
export const fileUrl = (fileId: string) => {
  const base = `${BASE}/file/${encodeURIComponent(fileId)}`;
  const token = getSessionToken();
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

export const getThumbnail = (photos?: PhotoSize[]): PhotoSize | null =>
  photos && photos.length > 0 ? photos[0] : null;

export const getFullSize = (photos?: PhotoSize[]): PhotoSize | null =>
  photos && photos.length > 0 ? photos[photos.length - 1] : null;

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
