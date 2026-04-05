/** Undo system — shared types */

export type UndoIcon = 'star' | 'trash' | 'archive' | 'heart';

export interface UndoActionRequest {
  id: string;
  message: string;
  icon?: UndoIcon;
  duration: number;
  /** Callback executed when user clicks Undo */
  onUndo: () => Promise<void>;
  /** Original data to restore (for persistent mode) */
  rollbackData?: unknown;
}

export interface UndoActionEntry extends UndoActionRequest {
  startedAt: number;
}

export type UndoMode = 'aware' | 'persistent';

export interface UndoConfig {
  mode: UndoMode;
  delayMs: number;
  maxStack: number;
}
