import db from './db';
import { authFetch } from '../authFetch';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generic offline cache layer on top of IndexedDB.
 * Use for any API response that should survive offline.
 */

/** Get cached data if not expired */
export async function getCached<T = any>(key: string): Promise<T | null> {
  try {
    const entry = await db.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttl) {
      await db.cache.delete(key);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

/** Store data in cache */
export async function setCache(key: string, data: any, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await db.cache.put({ key, data, cachedAt: Date.now(), ttl });
  } catch { /* IndexedDB might be full */ }
}

/** Delete cached entry */
export async function delCache(key: string): Promise<void> {
  try {
    await db.cache.delete(key);
  } catch { /* ignore */ }
}

/** Clear all expired cache entries */
export async function pruneCache(): Promise<void> {
  try {
    const now = Date.now();
    const all = await db.cache.toArray();
    const expired = all.filter((e) => now - e.cachedAt > e.ttl);
    await db.cache.bulkDelete(expired.map((e) => e.key));
  } catch { /* ignore */ }
}

/**
 * Fetch with offline fallback.
 * Tries network first, falls back to cache if offline.
 */
export async function fetchWithOfflineFallback<T = any>(
  url: string,
  cacheKey: string,
  ttl = DEFAULT_TTL,
): Promise<T> {
  // Online: fetch and cache
  if (navigator.onLine) {
    try {
      const res = await authFetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        await setCache(cacheKey, data, ttl);
        return data;
      }
    } catch {
      // Network error, fall through to cache
    }
  }

  // Offline or network error: try cache
  const cached = await getCached<T>(cacheKey);
  if (cached !== null) return cached;

  throw new Error('offline_no_cache');
}
