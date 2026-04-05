import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Search, LayoutGrid, List, Grid3X3, Sparkles, FolderPlus, Trash2, FolderInput, X, ChevronDown, CheckCircle2,
    Filter,

} from 'lucide-react';
import { useFavoritesStore } from '../stores/favorites';
import FavoriteCard from '../components/FavoriteCard';
import FavoriteModal from '../components/FavoriteModal';
import type { FavoriteItem, ViewMode } from '../services/favoritesApi';
import { useTelegram } from '../hooks/useTelegram';
import { SkeletonCard } from '../components/skeletons/SkeletonCard';

// ── Date grouping ────────────────────────────────
function groupLabel(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return 'this_week';
    if (days < 30) return 'this_month';
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function groupByDate(items: FavoriteItem[]): { label: string; items: FavoriteItem[] }[] {
    const groups: { label: string; items: FavoriteItem[] }[] = [];
    let current = '';
    for (const item of items) {
        const l = groupLabel(new Date(item.createdAt));
        if (l !== current) { current = l; groups.push({ label: l, items: [] }); }
        groups[groups.length - 1].items.push(item);
    }
    return groups;
}

// ── View mode icons ──────────────────────────────
const VIEW_ICONS: Record<ViewMode, typeof LayoutGrid> = { gallery: LayoutGrid, compact: Grid3X3, list: List };
const VIEW_ORDER: ViewMode[] = ['gallery', 'compact', 'list'];

// ── Filter chip ──────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all active:scale-95 ${active
                ? 'bg-tg-accent text-white shadow-sm'
                : 'bg-tg-secondary text-tg-text hover:brightness-110'
                }`}
        >
            {label}
        </button>
    );
}

export default function FavoritesPage() {
    const navigate = useNavigate();
    const { t } = useTranslation('favorites');
    const { haptic } = useTelegram();
    const store = useFavoritesStore();
    const {
        items, total, hasMore, loading, loadingMore,
        contexts, engines, activeContext, activeEngine, searchQuery, activeCollectionId,
        collections, viewMode, selectMode, selectedIds,
    } = store;

    // Search debounce
    const [searchInput, setSearchInput] = useState(searchQuery);
    const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        debounce.current = setTimeout(() => { if (searchInput !== searchQuery) store.setSearch(searchInput); }, 300);
        return () => clearTimeout(debounce.current);
    }, [searchInput, searchQuery, store]);

    // Modal state
    const [modalItem, setModalItem] = useState<FavoriteItem | null>(null);

    // New collection dialog
    const [showNewCol, setShowNewCol] = useState(false);
    const [newColName, setNewColName] = useState('');

    // Move dropdown
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Initial load
    useEffect(() => { store.load(); store.loadFilters(); store.loadCollections(); }, []);

    // Back button handling
    useEffect(() => {
        if (!modalItem) return;
        const handler = () => { setModalItem(null); };
        const back = window.Telegram?.WebApp?.BackButton;
        if (back) {
            back.show();
            back.onClick(handler);
            return () => { back.offClick(handler); };
        }
    }, [modalItem]);

    // Infinite scroll
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && hasMore && !loadingMore) store.loadMore(); }, { rootMargin: '400px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [items.length, hasMore, loadingMore, store]);

    const openModal = useCallback((item: FavoriteItem) => { haptic?.impactOccurred('light'); setModalItem(item); }, [haptic]);

    const handleDelete = useCallback(async (id: string) => {
        await store.remove(id);
        haptic?.notificationOccurred('success');
    }, [store, haptic]);

    const handleCreateCol = useCallback(async () => {
        const name = newColName.trim();
        if (!name) return;
        await store.createCol(name);
        setNewColName('');
        setShowNewCol(false);
        haptic?.notificationOccurred('success');
    }, [newColName, store, haptic]);

    const handleMoveSelected = useCallback(async (colId: string | null) => {
        await store.moveSelected(colId);
        setShowMoveMenu(false);
        store.clearSelection();
        haptic?.notificationOccurred('success');
    }, [store, haptic]);

    // Group items by date - uses t() for translating date group labels
    const translateGroupLabel = useCallback((label: string) => {
        const map: Record<string, string> = {
            today: t('common:today'),
            yesterday: t('common:yesterday'),
            this_week: t('common:this_week', { defaultValue: 'This week' }),
            this_month: t('common:this_month', { defaultValue: 'This month' }),
        };
        return map[label] ?? label;
    }, [t]);

    const groups = useMemo(() => {
        const raw = groupByDate(items);
        return raw.map(g => ({ ...g, label: translateGroupLabel(g.label) }));
    }, [items, translateGroupLabel]);

    const gridClass = viewMode === 'gallery'
        ? 'grid grid-cols-3 gap-[2px]'
        : viewMode === 'compact'
            ? 'grid grid-cols-4 gap-[1px]'
            : 'flex flex-col gap-[2px]';

    // Ref for measuring header height
    const headerRef = useRef<HTMLDivElement | null>(null);
    const [headerH, setHeaderH] = useState(0);

    useEffect(() => {
        if (!headerRef.current) return;
        const obs = new ResizeObserver(([e]) => setHeaderH(e.contentRect.height));
        obs.observe(headerRef.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div className="pb-24 relative">

            {/* ── Sticky header ── */}
            <div ref={headerRef} className="sticky top-0 z-30 bg-tg-bg/90 backdrop-blur-xl">

                {/* Title + view toggle row */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-[22px] font-bold text-tg-text ">{t('title')}</h1>
                        <span className="text-[13px] font-medium text-tg-text bg-tg-secondary px-2.5 py-0.5 rounded-full">{total}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('inspiration')}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 text-tg-accent hover:bg-tg-secondary"
                        >
                            <Sparkles size={18} />
                        </button>

                        {/* Segmented Control nativo */}
                        <div className="flex bg-tg-secondary p-0.5 rounded-[10px]">
                            {VIEW_ORDER.map((m) => {
                                const Icon = VIEW_ICONS[m];
                                const isActive = viewMode === m;
                                return (
                                    <button
                                        key={m}
                                        onClick={() => { haptic?.selectionChanged(); store.setViewMode(m); }}
                                        className={`w-8 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${isActive
                                            ? 'bg-tg-surface text-tg-text shadow-sm'
                                            : 'text-tg-hint hover:text-tg-text'
                                            }`}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => { haptic?.impactOccurred('light'); setShowFilters(!showFilters); }}
                                className={`w-8 h-7 rounded-md flex items-center justify-center transition-all duration-200 text-tg-hint hover:text-tg-text ${showFilters ? 'bg-tg-surface text-tg-text shadow-sm' : ''}`}
                            >
                                <Filter size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                {
                    showFilters && (
                        <div className="px-4 pb-3 transition-opacity duration-300" style={{ opacity: showFilters ? 1 : 0 }}>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint" />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder')}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-9 pr-9 py-2 rounded-[12px] bg-tg-secondary text-[15px] text-tg-text placeholder:text-tg-hint outline-none focus:ring-1 focus:ring-tg-accent/50 transition-all"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => { setSearchInput(''); store.setSearch(''); haptic?.impactOccurred('light'); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-tg-surface rounded-full flex items-center justify-center text-tg-text active:scale-95"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Filter chips - Ocultando la barra de scroll de forma nativa con Tailwind */}
                {
                    showFilters && (
                        <div className="flex gap-2 px-4 pb-3 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fade-in">
                            <Chip label={t('common:all')} active={!activeCollectionId} onClick={() => { haptic?.selectionChanged(); store.setCollectionId(''); }} />
                            {collections.map((c) => (
                                <Chip key={c._id} label={`${c.name} (${c.count})`} active={activeCollectionId === c._id} onClick={() => { haptic?.selectionChanged(); store.setCollectionId(c._id); }} />
                            ))}
                            <button
                                onClick={() => { haptic?.impactOccurred('light'); setShowNewCol(true); }}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-tg-secondary/40 text-tg-accent border-1 border-tg-accent/90 text-[13px] font-medium whitespace-nowrap active:scale-95 transition-all"
                            >
                                <FolderPlus size={14} /> {t('new')}
                            </button>

                            {(contexts.length > 0 || engines.length > 0) && <div className="w-px bg-tg-border/50 mx-1 self-stretch rounded-full" />}

                            {contexts.map((c) => (
                                <Chip key={c} label={c} active={activeContext === c} onClick={() => { haptic?.selectionChanged(); store.setContext(activeContext === c ? '' : c); }} />
                            ))}
                            {engines.map((e) => (
                                <Chip key={e} label={e} active={activeEngine === e} onClick={() => { haptic?.selectionChanged(); store.setEngine(activeEngine === e ? '' : e); }} />
                            ))}
                        </div>
                    )
                }

            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="px-0.5 sm:px-2 mt-1">
                    <div className="grid grid-cols-3 gap-[2px]">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-tg-secondary animate-pulse rounded-sm" />
                        ))}
                    </div>
                    <div className="mt-4 rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
                    <div className="w-20 h-20 rounded-full bg-tg-secondary flex items-center justify-center mb-5">
                        <Sparkles size={36} className="text-tg-hint/40" />
                    </div>
                    <p className="text-tg-text font-bold text-[18px]">{t('no_favorites')}</p>
                    <p className="text-tg-hint text-[14px] mt-2 max-w-[250px] leading-relaxed">{t('no_favorites_desc')}</p>
                </div>
            ) : (
                <div className="px-0.5 sm:px-2 mt-1">
                    {groups.map((g) => (
                        <div key={g.label} className="mb-4">
                            <div
                                className="sticky z-20 py-2.5 px-3 bg-tg-bg/95 backdrop-blur-md mb-1 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.1)]"
                                style={{ top: headerH }}
                            >
                                <span className="text-[13px] font-bold text-tg-text tracking-wide">{g.label}</span>
                            </div>
                            <div className={gridClass}>
                                {g.items.map((item, i) => (
                                    <FavoriteCard
                                        key={item._id}
                                        item={item}
                                        index={i}
                                        selectMode={selectMode}
                                        selected={selectedIds.has(item._id)}
                                        onSelect={(id) => { haptic?.selectionChanged(); store.toggleSelect(id); }}
                                        onClick={openModal}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
                <div className="flex justify-center py-6">
                    <div className="flex items-center gap-2 bg-tg-secondary px-4 py-2 rounded-full">
                        <div className="w-4 h-4 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-[13px] font-medium text-tg-text">{t('common:loading')}</span>
                    </div>
                </div>
            )}

            {/* ── Floating selection bar (portal) ── */}
            {selectMode && createPortal(
                <div className="fixed bottom-6 left-4 right-4 z-[9990] flex items-center justify-between p-3.5 rounded-2xl bg-tg-surface/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-tg-border">
                    <div className="flex items-center gap-2.5 ml-1">
                        <div className="w-7 h-7 rounded-full bg-tg-accent flex items-center justify-center">
                            <span className="text-[13px] font-bold text-white">{selectedIds.size}</span>
                        </div>
                        <span className="text-[14px] font-semibold text-tg-text">{t('selected')}</span>
                    </div>

                    <div className="flex gap-2">
                        {collections.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => { haptic?.impactOccurred('light'); setShowMoveMenu(!showMoveMenu); }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold active:scale-95 transition-all ${showMoveMenu ? 'bg-tg-accent text-white' : 'bg-tg-secondary text-tg-text hover:brightness-110'
                                        }`}
                                >
                                    <FolderInput size={15} /> {t('move')}
                                </button>

                                {showMoveMenu && (
                                    <div className="absolute bottom-full mb-3 right-0 w-48 rounded-[16px] bg-tg-surface backdrop-blur-xl border border-tg-border shadow-2xl p-1.5 z-50 origin-bottom-right">
                                        <button
                                            onClick={() => handleMoveSelected(null)}
                                            className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-tg-text hover:bg-tg-secondary transition-colors mb-1"
                                        >
                                            {t('remove_from_collection')}
                                        </button>
                                        <div className="h-px bg-tg-border/50 mx-2 my-1" />
                                        {collections.map((c) => (
                                            <button
                                                key={c._id}
                                                onClick={() => handleMoveSelected(c._id)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-medium text-tg-text hover:bg-tg-secondary transition-colors"
                                            >
                                                <span className="truncate">{c.name}</span>
                                                {activeCollectionId === c._id && <CheckCircle2 size={14} className="text-tg-accent flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => { haptic?.notificationOccurred('warning'); store.removeSelected(); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${selectedIds.size > 0
                                ? 'bg-red-500 text-white active:bg-red-600 active:scale-95 shadow-md'
                                : 'bg-tg-secondary text-tg-hint cursor-not-allowed'
                                }`}
                            disabled={selectedIds.size === 0}
                        >
                            <Trash2 size={15} />
                        </button>

                        <button
                            onClick={() => { haptic?.impactOccurred('light'); store.toggleSelectMode(); }}
                            className="w-9 h-9 rounded-xl bg-tg-secondary flex items-center justify-center text-tg-text active:scale-95 transition-all hover:brightness-110 ml-0.5"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>,
                document.body,
            )}

            {/* ── New collection dialog (portal) ── */}
            {showNewCol && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
                    onClick={() => setShowNewCol(false)}
                >
                    <div
                        className="w-full max-w-sm bg-tg-secondary border border-tg-border rounded-[20px] p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-[18px] font-bold text-tg-text mb-4 ">{t('new_collection')}</h3>

                        <input
                            autoFocus
                            type="text"
                            placeholder={t('collection_placeholder')}
                            value={newColName}
                            onChange={(e) => setNewColName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCol(); }}
                            maxLength={60}
                            className="w-full px-4 py-3 rounded-xl bg-tg-surface border border-tg-border text-[15px] text-tg-text placeholder:text-tg-hint outline-none focus:border-tg-accent focus:border-2 transition-all mb-5"
                        />

                        <div className="flex gap-2.5 mt-auto">
                            <button
                                onClick={() => setShowNewCol(false)}
                                className="flex-1 py-2.5 rounded-xl bg-tg-surface text-tg-text text-[14px] font-medium transition-colors hover:brightness-110 active:scale-95"
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                onClick={handleCreateCol}
                                disabled={!newColName.trim()}
                                className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-tg-accent text-white disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all shadow-md"
                            >
                                {t('common:create')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* ── Modal ── */}
            {modalItem && (
                <FavoriteModal
                    item={modalItem}
                    items={items}
                    onClose={() => setModalItem(null)}
                    onDelete={handleDelete}
                    onNavigate={(it) => { haptic?.selectionChanged(); setModalItem(it); }}
                />
            )}
        </div>
    );
}