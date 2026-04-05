import { create } from 'zustand';
import i18next from 'i18next';
import {
  fetchFavorites, fetchFilters, fetchCollections,
  deleteFavorite as apiDelete, batchDeleteFavorites as apiBatchDelete,
  undoDeleteFavorites as apiUndoDelete,
  moveFavorites as apiMove,
  createCollection as apiCreateCol, updateCollection as apiUpdateCol, deleteCollection as apiDeleteCol,
  type FavoriteItem, type Collection, type ViewMode,
} from '../services/favoritesApi';
import { useUndoStore } from '../hooks/useUndo';

interface FavoritesState {
  items: FavoriteItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;

  contexts: string[];
  engines: string[];
  activeContext: string;
  activeEngine: string;
  searchQuery: string;
  activeCollectionId: string;

  collections: Collection[];

  viewMode: ViewMode;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  selectedIds: Set<string>;
  selectMode: boolean;

  load: (options?: { filters?: { projections?: string | string[] } }) => Promise<void>;
  loadMore: () => Promise<void>;
  loadFilters: () => Promise<void>;
  loadCollections: () => Promise<void>;
  setContext: (v: string) => void;
  setEngine: (v: string) => void;
  setSearch: (v: string) => void;
  setCollectionId: (v: string) => void;
  setViewMode: (v: ViewMode) => void;
  remove: (id: string) => Promise<void>;
  removeSelected: () => Promise<void>;
  moveSelected: (collectionId: string | null) => Promise<void>;
  toggleSelect: (id: string) => void;
  toggleSelectMode: () => void;
  selectAll: () => void;
  clearSelection: () => void;

  createCol: (name: string) => Promise<void>;
  updateCol: (id: string, name: string) => Promise<void>;
  deleteCol: (id: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [], total: 0, nextCursor: null, hasMore: false,
  contexts: [], engines: [],
  activeContext: '', activeEngine: '', searchQuery: '', activeCollectionId: '',
  collections: [],
  viewMode: (localStorage.getItem('fav_view') as ViewMode) || 'gallery',
  loading: false, loadingMore: false, error: null,
  selectedIds: new Set<string>(), selectMode: false,

  load: async (options) => {
    const { activeContext, activeEngine, searchQuery, activeCollectionId } = get();
    set({ loading: true, error: null });
    try {
      const res = await fetchFavorites({
        limit: 24,
        context: activeContext || undefined,
        engine: activeEngine || undefined,
        search: searchQuery || undefined,
        collectionId: activeCollectionId || undefined,
        filters: options?.filters,
      });
      if (res.ok) set({ items: res.items, total: res.total, nextCursor: res.nextCursor, hasMore: res.hasMore, loading: false });
      else set({ error: 'Error cargando', loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },

  loadMore: async () => {
    const { nextCursor, hasMore, loadingMore, activeContext, activeEngine, searchQuery, activeCollectionId } = get();
    if (!hasMore || loadingMore || !nextCursor) return;
    set({ loadingMore: true });
    try {
      const res = await fetchFavorites({
        cursor: nextCursor, limit: 24,
        context: activeContext || undefined, engine: activeEngine || undefined,
        search: searchQuery || undefined, collectionId: activeCollectionId || undefined,
      });
      if (res.ok) set((s) => ({ items: [...s.items, ...res.items], nextCursor: res.nextCursor, hasMore: res.hasMore, total: res.total, loadingMore: false }));
    } catch { set({ loadingMore: false }); }
  },

  loadFilters: async () => {
    try { const r = await fetchFilters(); if (r.ok) set({ contexts: r.contexts, engines: r.engines }); } catch {}
  },

  loadCollections: async () => {
    try { const r = await fetchCollections(); if (r.ok) set({ collections: r.items }); } catch {}
  },

  setContext: (v) => { set({ activeContext: v, items: [], nextCursor: null }); get().load(); },
  setEngine: (v) => { set({ activeEngine: v, items: [], nextCursor: null }); get().load(); },
  setSearch: (v) => { set({ searchQuery: v, items: [], nextCursor: null }); get().load(); },
  setCollectionId: (v) => { set({ activeCollectionId: v, items: [], nextCursor: null }); get().load(); },
  setViewMode: (v) => { localStorage.setItem('fav_view', v); set({ viewMode: v }); },

  remove: async (id) => {
    const removedItem = get().items.find((i) => i._id === id);
    try {
      const res = await apiDelete(id);
      set((s) => {
        const next = new Set(s.selectedIds); next.delete(id);
        return { items: s.items.filter((i) => i._id !== id), total: Math.max(0, s.total - 1), selectedIds: next };
      });

      useUndoStore.getState().push({
        id: res.jobId || `fav_${id}_${Date.now()}`,
        message: i18next.t('favorites:removed', 'Removed from favorites'),
        icon: 'star',
        duration: 6000,
        onUndo: async () => {
          if (res.status === 'pending_delete') {
            await apiUndoDelete([id]);
          }
          // In both modes, restore local state
          if (removedItem) {
            set((s) => ({ items: [removedItem, ...s.items], total: s.total + 1 }));
          }
        },
      });
    } catch (e: any) { set({ error: e.message }); }
  },

  removeSelected: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const removedItems = get().items.filter((i) => selectedIds.has(i._id));
    try {
      const r = await apiBatchDelete(ids);
      if (r.ok) {
        set((s) => ({
          items: s.items.filter((i) => !selectedIds.has(i._id)),
          total: Math.max(0, s.total - r.count),
          selectedIds: new Set<string>(), selectMode: false,
        }));

        useUndoStore.getState().push({
          id: r.jobId || `fav_batch_${Date.now()}`,
          message: i18next.t('favorites:removed_count', { count: r.count, defaultValue: `${r.count} removed` }),
          icon: 'star',
          duration: 6000,
          onUndo: async () => {
            if (r.status === 'pending_delete') {
              await apiUndoDelete(ids);
            }
            set((s) => ({
              items: [...removedItems, ...s.items],
              total: s.total + removedItems.length,
            }));
          },
        });
      }
    } catch (e: any) { set({ error: e.message }); }
  },

  moveSelected: async (collectionId) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    try {
      await apiMove(Array.from(selectedIds), collectionId);
      set((s) => ({
        items: s.items.map((i) =>
          selectedIds.has(i._id) ? { ...i, collectionId } : i,
        ),
        selectedIds: new Set<string>(), selectMode: false,
      }));
      get().loadCollections();
    } catch (e: any) { set({ error: e.message }); }
  },

  toggleSelect: (id) => set((s) => {
    const next = new Set(s.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    return { selectedIds: next, selectMode: true };
  }),
  toggleSelectMode: () => set((s) => ({ selectMode: !s.selectMode, selectedIds: s.selectMode ? new Set<string>() : s.selectedIds })),
  selectAll: () => set((s) => ({ selectedIds: new Set(s.items.map((i) => i._id)) })),
  clearSelection: () => set({ selectedIds: new Set<string>() }),

  createCol: async (name) => {
    await apiCreateCol(name);
    get().loadCollections();
  },
  updateCol: async (id, name) => {
    await apiUpdateCol(id, name);
    get().loadCollections();
  },
  deleteCol: async (id) => {
    await apiDeleteCol(id);
    const { activeCollectionId } = get();
    if (activeCollectionId === id) set({ activeCollectionId: '', items: [], nextCursor: null });
    get().loadCollections();
    get().load();
  },
}));
