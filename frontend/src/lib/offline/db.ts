import Dexie, { type EntityTable } from 'dexie';

/**
 * IndexedDB schema for offline-first caching.
 * Stores commands, favorites, search history, and a sync queue.
 */

export interface CachedCommand {
  uniqueName: string;
  name: string;
  category: string;
  description: string;
  alias: string[];
  cachedAt: number;
}

export interface CachedFavorite {
  id?: number;
  command: string;
  pinned: boolean;
  createdAt: number;
  cachedAt: number;
}

export interface CachedSearch {
  id?: number;
  query: string;
  timestamp: number;
}

export interface SyncQueueItem {
  id?: number;
  action: string; // 'add_favorite' | 'remove_favorite' | 'rate_command' | 'submit_review'
  payload: Record<string, any>;
  createdAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface CacheMetadata {
  key: string;
  data: any;
  cachedAt: number;
  ttl: number; // ms
}

const db = new Dexie('TrelkOfflineDB') as Dexie & {
  commands: EntityTable<CachedCommand, 'uniqueName'>;
  favorites: EntityTable<CachedFavorite, 'id'>;
  searches: EntityTable<CachedSearch, 'id'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
  cache: EntityTable<CacheMetadata, 'key'>;
};

db.version(1).stores({
  commands: 'uniqueName, category, cachedAt',
  favorites: '++id, command, cachedAt',
  searches: '++id, query, timestamp',
  syncQueue: '++id, action, status, createdAt',
  cache: 'key, cachedAt',
});

export default db;
