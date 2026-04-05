import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { useToastStore } from '../stores';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug, findCommand } from '../data/botCommands';
import { useCommandFavoritesStore } from '../stores/commandFavorites';
import { fetchCommandFavorites, type CommandFavoriteItem, type TrendingCommand } from '../services/commandFavoritesApi';
import SmartEmptyState from '../components/SmartEmptyState';
import {
  Star, Pin, HeartOff, ArrowUpDown,
  Search, TrendingUp, Flame, Loader2,
  Sparkles, Filter,
} from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

type SortKey = 'recent' | 'alpha';
const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'recent', labelKey: 'recent' },
  { key: 'alpha', labelKey: 'alpha' },
];

const PAGE_SIZE = 30;

export default function CommandFavoritesPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const showToast = useToastStore((s) => s.show);

  const { favorites, loaded, loadFavorites, remove, togglePin, trending, loadTrending } = useCommandFavoritesStore();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [items, setItems] = useState<CommandFavoriteItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    loadFavorites();
    loadTrending();
  }, [loadFavorites, loadTrending]);

  // Fetch paginated list when search changes
  const fetchPage = useCallback(async (reset = false) => {
    const offset = reset ? 0 : offsetRef.current;
    if (!reset && !hasMore) return;

    if (reset) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetchCommandFavorites(offset, PAGE_SIZE, search || undefined);
      if (reset) {
        setItems(res.items);
        if (res.total !== undefined) setTotal(res.total);
      } else {
        setItems((prev) => [...prev, ...res.items]);
      }
      setHasMore(res.hasMore);
      offsetRef.current = res.nextOffset;
    } catch {
      // silent
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [search, hasMore]);

  // Reset on search change
  useEffect(() => {
    offsetRef.current = 0;
    fetchPage(true);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loadingMore) fetchPage(); },
      { rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, fetchPage]);

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };

  const handleRemove = async (slug: string) => {
    haptic?.notificationOccurred('warning');
    await remove(slug);
    setItems((prev) => prev.filter((i) => i.command !== slug));
    setTotal((t) => Math.max(0, t - 1));
    showToast(t('removed_from_favorites', 'Removed from favorites'), 'info');
  };

  const handlePin = async (slug: string) => {
    haptic?.impactOccurred('light');
    const pinned = await togglePin(slug);
    setItems((prev) =>
      prev.map((i) => (i.command === slug ? { ...i, pinned } : i)),
    );
    showToast(pinned ? t('pinned', 'Pinned') : t('unpinned', 'Unpinned'), 'info');
  };

  // Apply client-side sort + category filter
  const sorted = useMemo(() => {
    let list = [...items];
    if (selectedCat) {
      list = list.filter((i) => {
        const cmd = findCommand(i.command);
        return cmd?.category === selectedCat;
      });
    }
    if (sort === 'alpha') {
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.command.localeCompare(b.command);
      });
    }
    return list;
  }, [items, sort, selectedCat]);

  return (
    <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto min-h-screen">
      <StickyHeader 
        title={t('favorites:title', 'Favorites')} 
        subtitle={t('commands_saved', { count: total, defaultValue: `${total} Commands Saved` })}
      />

      {/* ── Stats Summary ── */}
      {!initialLoading && total > 0 && !search && (
        <div className="px-5 mt-3 flex gap-2">
          <div className="flex-1 bg-tg-secondary border border-tg-border/30 rounded-[14px] px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-pink-500/10 flex items-center justify-center">
              <Star size={16} className="text-pink-500 fill-pink-500/20" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-tg-text leading-none">{total}</div>
              <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider mt-0.5">{t('favorites:title', 'Favorites')}</div>
            </div>
          </div>
          {trending.length > 0 && (
            <div className="flex-1 bg-tg-secondary border border-tg-border/30 rounded-[14px] px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-orange-500/10 flex items-center justify-center">
                <Flame size={16} className="text-orange-500" />
              </div>
              <div>
                <div className="text-[16px] font-extrabold text-tg-text leading-none">{trending.length}</div>
                <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider mt-0.5">{t('trending_week', 'Trending')}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Category Filter ── */}
      {!initialLoading && total > 0 && !search && (
        <div className="flex gap-2 overflow-x-auto px-5 mt-3 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => { haptic?.impactOccurred('light'); setSelectedCat(null); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
              !selectedCat
                ? 'bg-tg-accent text-white border-tg-accent shadow-sm'
                : 'bg-tg-secondary text-tg-hint border-tg-border/40'
            }`}
          >
            {t('all', 'All')}
          </button>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => { haptic?.impactOccurred('light'); setSelectedCat(key === selectedCat ? null : key); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border flex items-center gap-1.5 ${
                selectedCat === key
                  ? 'text-white shadow-sm'
                  : 'bg-tg-secondary text-tg-hint border-tg-border/40'
              }`}
              style={selectedCat === key ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
            >
              <meta.icon size={12} />
              {meta.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Buscador + Ordenamiento ── */}
      <div className="px-5 mt-4 flex gap-3 h-[42px]">
        
        <div className="flex-1 relative h-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_favorites', 'Search favorites...')}
            className="w-full h-full bg-tg-bg border border-tg-border/40 rounded-[14px] pl-10 pr-4 text-[15px] text-tg-text placeholder:text-tg-hint/70 outline-none focus:border-tg-accent/50 focus:ring-1 focus:ring-tg-accent/20 transition-all shadow-sm"
          />
        </div>

        <button
          onClick={() => {
            haptic?.impactOccurred('light');
            setSort((s) => SORT_OPTIONS[(SORT_OPTIONS.findIndex((o) => o.key === s) + 1) % SORT_OPTIONS.length].key);
          }}
          className="h-full px-4 bg-tg-secondary border border-tg-border/40 rounded-[14px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm hover:bg-tg-hint/5 flex-shrink-0"
        >
          <ArrowUpDown size={16} className="text-tg-accent" />
          <span className="text-[13px] font-bold text-tg-text">{t(SORT_OPTIONS.find((o) => o.key === sort)?.labelKey ?? 'recent', sort === 'recent' ? 'Recent' : 'A-Z')}</span>
        </button>
      </div>

      {/* ── Trending Commands ── */}
      {trending.length > 0 && !search && (
        <section className="mt-6">
          <div className="flex items-center gap-2 px-6 mb-2.5">
            <TrendingUp size={16} className="text-orange-500" />
            <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider">{t('trending_week', 'Trending This Week')}</h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {trending.map((t_, i) => {
              const cmd = findCommand(t_.command);
              return (
                <button
                  key={t_.command}
                  onClick={() => go(t_.command)}
                  className="flex-shrink-0 bg-tg-secondary border border-tg-border/40 rounded-[16px] px-4 py-3.5 min-w-[130px] text-left active:scale-95 transition-transform shadow-sm hover:bg-tg-hint/5 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">#{i + 1}</span>
                    <Flame size={14} className="text-orange-500" />
                  </div>
                  <div className="text-[15px] font-bold text-tg-text font-mono truncate leading-tight">/{t_.command}</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-1 truncate">{t_.count} {t('common:favs', 'favs')}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Loading state ── */}
      {initialLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="animate-spin text-tg-accent" />
          <span className="text-[13px] font-medium text-tg-hint animate-pulse">{t('common:loading', 'Loading...')}</span>
        </div>
      )}

      {/* ── Lista de Comandos ── */}
      {!initialLoading && (
        <section className="mt-4 px-5">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 px-1">
            {t('all', 'All Favorites')} ({total})
          </h2>

          {sorted.length > 0 ? (
            <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm animate-slide-up">
              <div className="flex flex-col">
                {sorted.map((fav) => {
                  const cmd = findCommand(fav.command);
                  if (!cmd) return null;
                  const slug = cmdSlug(cmd);
                  const cat = CATEGORY_META[cmd.category];
                  const CatIcon = cat?.icon;
                  const isComponent = typeof CatIcon !== 'string';

                  return (
                    <div key={slug} className="flex items-center justify-between p-3.5 border-b border-tg-border/20 last:border-0 transition-colors hover:bg-tg-hint/5 group">

                      {/* Área clickeable principal */}
                      <button
                        onClick={() => go(slug)}
                        className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                      >
                        <div
                          className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-95"
                          style={{ backgroundColor: `${cat?.color}15`, border: `1px solid ${cat?.color}20` }}
                        >
                          {isComponent && CatIcon ? (
                            // @ts-ignore
                            <CatIcon size={18} style={{ color: cat?.color }} />
                          ) : (
                            <span className="text-[16px] drop-shadow-sm">{CatIcon}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-tg-text font-mono truncate leading-tight">/{slug}</span>
                            {fav.pinned && <Pin size={12} className="text-tg-accent flex-shrink-0 fill-tg-accent/20" />}
                          </div>
                          <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5">{cmd.description}</div>
                        </div>
                      </button>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-shrink-0 pl-3">
                        <button
                          onClick={() => handlePin(slug)}
                          className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center active:scale-90 transition-all shadow-sm border ${
                            fav.pinned
                              ? 'bg-tg-accent/10 border-tg-accent/20 text-tg-accent'
                              : 'bg-tg-bg border-tg-border/40 text-tg-hint hover:text-tg-text hover:bg-tg-hint/5'
                          }`}
                          title={fav.pinned ? t('unpin', 'Unpin') : t('pin', 'Pin')}
                        >
                          <Pin size={16} className={fav.pinned ? 'fill-tg-accent/20' : ''} />
                        </button>

                        <button
                          onClick={() => handleRemove(slug)}
                          className="w-[34px] h-[34px] rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center active:scale-90 transition-all hover:bg-red-500/20 text-red-500 shadow-sm"
                          title={t('remove_favorite', 'Remove')}
                        >
                          <HeartOff size={16} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ) : search ? (
            /* ── No search results ── */
            <div className="text-center py-12 bg-tg-secondary border border-tg-border/40 rounded-[24px] shadow-sm px-5 mt-2">
              <div className="w-[56px] h-[56px] mx-auto bg-tg-hint/10 rounded-[16px] flex items-center justify-center mb-4 shadow-inner">
                <Star size={28} className="text-tg-hint/40" />
              </div>
              <p className="text-[18px] font-bold text-tg-text leading-tight mb-1">{t('no_results', 'No results found')}</p>
              <p className="text-[13px] font-medium text-tg-hint mt-1 leading-relaxed max-w-[220px] mx-auto">
                {t('no_search_match', 'Try adjusting your search terms.')}
              </p>
            </div>
          ) : (
            <SmartEmptyState context="favorites" title={t('no_favorites_yet', 'No favorites yet')} description={t('no_favorites_desc', 'Save your favorite commands to see them here.')} />
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2.5 bg-tg-secondary border border-tg-border/40 shadow-sm px-4 py-2.5 rounded-full">
                <div className="w-4 h-4 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] font-semibold text-tg-text">{t('common:loading', 'Loading...')}</span>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}