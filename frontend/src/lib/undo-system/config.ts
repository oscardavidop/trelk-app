import type { UndoConfig, UndoMode } from './types';

const DEFAULT_DELAY_MS = 6000;
const DEFAULT_MAX_STACK = 5;

export function getUndoConfig(): UndoConfig {
  const mode = (import.meta.env.VITE_UNDO_MODE as UndoMode) || 'persistent';
  const delayMs = parseInt(import.meta.env.VITE_UNDO_DELAY_MS || '') || DEFAULT_DELAY_MS;
  const maxStack = parseInt(import.meta.env.VITE_UNDO_MAX_STACK || '') || DEFAULT_MAX_STACK;

  return {
    mode: mode === 'persistent' ? 'persistent' : 'aware',
    delayMs,
    maxStack,
  };
}
