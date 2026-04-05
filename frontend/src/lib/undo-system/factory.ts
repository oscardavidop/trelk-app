import type { UndoMode } from './types';
import type { UndoStrategy } from './strategies/UndoStrategy';
import { AwareUndoStrategy } from './strategies/AwareUndoStrategy';
import { PersistentUndoStrategy } from './strategies/PersistentUndoStrategy';
import { getUndoConfig } from './config';

let cachedStrategy: UndoStrategy | null = null;
let cachedMode: UndoMode | null = null;

/**
 * Factory — creates the appropriate UndoStrategy based on env config.
 * Caches the instance so the same strategy is reused across the app.
 */
export function createUndoStrategy(modeOverride?: UndoMode): UndoStrategy {
  const mode = modeOverride ?? getUndoConfig().mode;

  if (cachedStrategy && cachedMode === mode) return cachedStrategy;

  // Clean up previous strategy
  cachedStrategy?.dispose();

  cachedStrategy = mode === 'persistent'
    ? new PersistentUndoStrategy()
    : new AwareUndoStrategy();
  cachedMode = mode;

  return cachedStrategy;
}

/**
 * Get or create the current strategy singleton.
 */
export function getUndoStrategy(): UndoStrategy {
  if (!cachedStrategy) return createUndoStrategy();
  return cachedStrategy;
}

/**
 * Switch strategy at runtime (e.g. fallback from aware → persistent).
 */
export function switchStrategy(mode: UndoMode): UndoStrategy {
  return createUndoStrategy(mode);
}
