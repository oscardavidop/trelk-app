import { create } from 'zustand';
import {
  type UndoActionRequest, type UndoActionEntry, type UndoIcon,
  getUndoConfig, getUndoStrategy, switchStrategy,
} from '../lib/undo-system';

export type UndoAction = UndoActionEntry;
export type { UndoIcon };

interface UndoStore {
  actions: UndoActionEntry[];
  push: (action: UndoActionRequest) => void;
  remove: (id: string) => void;
  undo: (id: string) => Promise<void>;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  actions: [],

  push: (action) => {
    const config = getUndoConfig();
    const strategy = getUndoStrategy();

    const callbacks = {
      addEntry: (entry: UndoActionEntry) => {
        set((s) => ({
          actions: [entry, ...s.actions].slice(0, config.maxStack),
        }));
      },
      removeEntry: (id: string) => {
        set((s) => ({ actions: s.actions.filter((a) => a.id !== id) }));
      },
    };

    try {
      strategy.push(action, callbacks);
    } catch {
      // Fallback: if aware strategy fails, switch to persistent
      const fallback = switchStrategy('persistent');
      fallback.push(action, callbacks);
    }
  },

  remove: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),

  undo: async (id) => {
    const action = get().actions.find((a) => a.id === id);
    if (!action) return;

    const strategy = getUndoStrategy();
    const callbacks = {
      removeEntry: (actionId: string) => {
        set((s) => ({ actions: s.actions.filter((a) => a.id !== actionId) }));
      },
    };

    try {
      await strategy.undo(action, callbacks);
    } catch {
      // Silently fail — item was already committed or expired
    }
  },
}));
