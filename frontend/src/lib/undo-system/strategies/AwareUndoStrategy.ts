import type { UndoStrategy } from './UndoStrategy';
import type { UndoActionRequest, UndoActionEntry } from '../types';

/**
 * AwareUndoStrategy — backend-powered undo.
 *
 * The backend marks items as `pending_delete` and schedules a BullMQ job.
 * The frontend just shows the toast; undo calls the backend `POST /undo` endpoint.
 * Auto-removal after `duration + 400ms` (exit animation buffer).
 */
export class AwareUndoStrategy implements UndoStrategy {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  push(
    action: UndoActionRequest,
    { addEntry, removeEntry }: { addEntry: (e: UndoActionEntry) => void; removeEntry: (id: string) => void },
  ): void {
    const entry: UndoActionEntry = { ...action, startedAt: Date.now() };
    addEntry(entry);

    const timer = setTimeout(() => {
      removeEntry(entry.id);
      this.timers.delete(entry.id);
    }, action.duration + 400);

    this.timers.set(entry.id, timer);
  }

  async undo(
    action: UndoActionEntry,
    { removeEntry }: { removeEntry: (id: string) => void },
  ): Promise<void> {
    // Clear auto-remove timer
    const timer = this.timers.get(action.id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(action.id);
    }

    // Remove from UI immediately
    removeEntry(action.id);

    // Call the backend undo callback
    await action.onUndo();
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
