import type { UndoActionRequest, UndoActionEntry } from '../';

/**
 * Strategy interface for undo operations.
 * Each strategy decides HOW undo actions are scheduled and cancelled.
 */
export interface UndoStrategy {
  /**
   * Schedule a new undo action. Returns the timestamped entry.
   * The strategy handles timer management and auto-removal.
   */
  push(
    action: UndoActionRequest,
    callbacks: {
      addEntry: (entry: UndoActionEntry) => void;
      removeEntry: (id: string) => void;
    },
  ): void;

  /**
   * Execute undo — restore the action.
   */
  undo(
    action: UndoActionEntry,
    callbacks: {
      removeEntry: (id: string) => void;
    },
  ): Promise<void>;

  /** Clean up timers, localStorage, etc. */
  dispose(): void;
}
