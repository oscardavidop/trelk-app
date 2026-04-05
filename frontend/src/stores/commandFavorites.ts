import { create } from 'zustand';
import i18next from 'i18next';
import {
  fetchFavoriteSet,
  toggleCommandFavorite,
  removeCommandFavorite,
  undoCommandFavoriteDelete,
  togglePinCommand,
  fetchTrending,
  type CommandFavoriteItem,
  type TrendingCommand,
} from '../services/commandFavoritesApi';
import { useUndoStore } from '../hooks/useUndo';

interface CommandFavoritesState {
  /** Set of favorited command slugs */
  favorites: Set<string>;
  /** Trending commands this week */
  trending: TrendingCommand[];
  loaded: boolean;
  loading: boolean;

  /** Load the full favorites set from API */
  loadFavorites: () => Promise<void>;
  /** Load trending commands */
  loadTrending: () => Promise<void>;
  /** Toggle a command's favorite status — returns true if added */
  toggle: (command: string) => Promise<boolean>;
  /** Remove a favorite */
  remove: (command: string, onRestore?: () => void) => Promise<void>;
  /** Toggle pin on a favorite */
  togglePin: (command: string) => Promise<boolean>;
  /** Quick check if a command is favorited */
  isFavorite: (command: string) => boolean;
}

export const useCommandFavoritesStore = create<CommandFavoritesState>()((set, get) => ({
  favorites: new Set<string>(),
  trending: [],
  loaded: false,
  loading: false,

  loadFavorites: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const commands = await fetchFavoriteSet();
      set({ favorites: new Set(commands), loaded: true });
    } catch {
      // keep previous state
    } finally {
      set({ loading: false });
    }
  },

  loadTrending: async () => {
    try {
      const items = await fetchTrending(10);
      set({ trending: items });
    } catch {
      // silent
    }
  },

  toggle: async (command: string) => {
    const slug = command.toLowerCase();
    // Optimistic update
    const prev = new Set(get().favorites);
    const wasAdded = !prev.has(slug);
    const next = new Set(prev);
    if (wasAdded) next.add(slug);
    else next.delete(slug);
    set({ favorites: next });

    try {
      const { added } = await toggleCommandFavorite(slug);
      // Reconcile if server disagrees
      if (added !== wasAdded) {
        const reconciled = new Set(get().favorites);
        if (added) reconciled.add(slug);
        else reconciled.delete(slug);
        set({ favorites: reconciled });
      }
      return added;
    } catch {
      // Rollback on error
      set({ favorites: prev });
      throw new Error('Failed to toggle favorite');
    }
  },

  remove: async (command: string, onRestore?: () => void) => {
    const slug = command.toLowerCase();
    const prev = new Set(get().favorites);
    const next = new Set(prev);
    next.delete(slug);
    set({ favorites: next });

    try {
      const res = await removeCommandFavorite(slug);

      const undoCallback = async () => {
        if (res.status === 'pending_delete') {
          await undoCommandFavoriteDelete([slug]);
        } else {
          // Persistent mode — re-add via toggle
          await toggleCommandFavorite(slug);
        }
        const updated = new Set(get().favorites);
        updated.add(slug);
        set({ favorites: updated });
        onRestore?.();
      };

      useUndoStore.getState().push({
        id: res.jobId || `cf_${slug}_${Date.now()}`,
        message: i18next.t('common:removed', 'Removed'),
        icon: 'heart',
        duration: 6000,
        onUndo: undoCallback,
      });
    } catch {
      set({ favorites: prev });
    }
  },

  togglePin: async (command: string) => {
    const { pinned } = await togglePinCommand(command.toLowerCase());
    return pinned;
  },

  isFavorite: (command: string) => {
    return get().favorites.has(command.toLowerCase());
  },
}));
