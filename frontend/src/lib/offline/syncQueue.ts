import db, { type SyncQueueItem } from './db';
import { authFetch } from '../authFetch';

const MAX_RETRIES = 3;

/**
 * Offline sync queue. Enqueues actions when offline,
 * processes them when connectivity returns.
 */

/** Add an action to the sync queue */
export async function enqueue(action: string, payload: Record<string, any>): Promise<void> {
  await db.syncQueue.add({
    action,
    payload,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  });
}

/** Process all pending items in the queue */
export async function processQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await db.syncQueue
    .where('status')
    .anyOf('pending', 'failed')
    .filter((item) => item.retries < MAX_RETRIES)
    .toArray();

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await db.syncQueue.update(item.id!, { status: 'syncing' });
      await executeAction(item);
      await db.syncQueue.delete(item.id!);
      synced++;
    } catch {
      const retries = item.retries + 1;
      await db.syncQueue.update(item.id!, {
        status: retries >= MAX_RETRIES ? 'failed' : 'pending',
        retries,
      });
      failed++;
    }
  }

  return { synced, failed };
}

/** Get count of pending sync items */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.where('status').equals('pending').count();
}

/** Clear all completed/failed items */
export async function clearCompleted(): Promise<void> {
  await db.syncQueue.where('status').equals('failed').delete();
}

// ── Action executors ──

async function executeAction(item: SyncQueueItem): Promise<void> {
  const { action, payload } = item;

  const handlers: Record<string, () => Promise<void>> = {
    add_favorite: () =>
      fetchPost('/api/v1/ui/command-favorites', payload),
    remove_favorite: () =>
      fetchDelete(`/api/v1/ui/command-favorites/${payload.command}`),
    rate_command: () =>
      fetchPost(`/api/v1/ui/bot-commands/${payload.command}/rate`, payload),
  };

  const handler = handlers[action];
  if (!handler) throw new Error(`Unknown sync action: ${action}`);
  await handler();
}

async function fetchPost(url: string, body: Record<string, any>): Promise<void> {
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function fetchDelete(url: string): Promise<void> {
  const res = await authFetch(url, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
