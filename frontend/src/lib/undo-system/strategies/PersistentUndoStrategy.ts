import type { UndoStrategy } from './UndoStrategy';
import type { UndoActionRequest, UndoActionEntry } from '../types';

const LS_KEY = 'undo_pending_actions';

interface StoredAction {
  id: string;
  expiresAt: number;
  rollbackData?: unknown;
}

/**
 * PersistentUndoStrategy — frontend-only undo with localStorage.
 *
 * Items are deleted immediately on the backend (hard delete).
 * Undo restores data from the rollbackData stored locally.
 * A local timer auto-clears after duration expires.
 * Survives page refreshes within the undo window.
 */
export class PersistentUndoStrategy implements UndoStrategy {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.cleanExpired();
  }

  push(
    action: UndoActionRequest,
    { addEntry, removeEntry }: { addEntry: (e: UndoActionEntry) => void; removeEntry: (id: string) => void },
  ): void {
    const entry: UndoActionEntry = { ...action, startedAt: Date.now() };
    addEntry(entry);

    // Persist to localStorage
    this.persistAction({
      id: action.id,
      expiresAt: Date.now() + action.duration,
      rollbackData: action.rollbackData,
    });

    const timer = setTimeout(() => {
      removeEntry(entry.id);
      this.removePersistedAction(entry.id);
      this.timers.delete(entry.id);
    }, action.duration + 400);

    this.timers.set(entry.id, timer);
  }

  async undo(
    action: UndoActionEntry,
    { removeEntry }: { removeEntry: (id: string) => void },
  ): Promise<void> {
    const timer = this.timers.get(action.id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(action.id);
    }

    removeEntry(action.id);
    this.removePersistedAction(action.id);

    // Execute the undo callback (re-create on backend from rollbackData)
    await action.onUndo();
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  // ── localStorage helpers ──

  private getStored(): StoredAction[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private persistAction(action: StoredAction): void {
    const stored = this.getStored();
    stored.push(action);
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  }

  private removePersistedAction(id: string): void {
    const stored = this.getStored().filter((a) => a.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  }

  private cleanExpired(): void {
    const now = Date.now();
    const stored = this.getStored().filter((a) => a.expiresAt > now);
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  }
}
