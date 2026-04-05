export type { UndoStrategy } from './strategies/UndoStrategy';
export type { UndoActionRequest, UndoActionEntry, UndoMode, UndoConfig, UndoIcon } from './types';
export { AwareUndoStrategy, PersistentUndoStrategy } from './strategies';
export { createUndoStrategy, getUndoStrategy, switchStrategy } from './factory';
export { getUndoConfig } from './config';
