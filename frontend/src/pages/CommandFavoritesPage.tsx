import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { useToastStore } from '../stores';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug, findCommand } from '../data/botCommands';
import { useCommandFavoritesStore } from '../stores/commandFavorites';
import { fetchCommandFavorites, type CommandFavoriteItem, type TrendingCommand } from '../services/commandFavoritesApi';
import {
  Star, Pin, HeartOff, ArrowUpDown,
  Search, TrendingUp, Flame, Loader2,
} from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

type SortKey = 'recent' | 'alpha';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recientes' },
  { key: 'alpha', label: 'A-Z' },
];

const PAGE_SIZE = 30;

export default function CommandFavoritesPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);

  const { favorites, loaded, loadFavorites, remove, togglePin, trending, loadTrending } = useCommandFavoritesStore();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [items, setItems] = useState<CommandFavoriteItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [total, setTotal] = useState(0);
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
    showToast('Eliminado de favoritos', 'info');
  };

  const handlePin = async (slug: string) => {
    haptic?.impactOccurred('light');
    const pinned = await togglePin(slug);
    setItems((prev) =>
      prev.map((i) => (i.command === slug ? { ...i, pinned } : i)),
    );
    showToast(pinned ? 'Fijado' : 'Desfijado', 'info');
  };

  // Apply client-side sort
  const sorted = useMemo(() => {
    const list = [...items];
    if (sort === 'alpha') {
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.command.localeCompare(b.command);
      });
    }
    return list;
  }, [items, sort]);

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title="Favoritos" subtitle={`${total} comandos guardados`} icon={<Star className="h-6 w-6 text-pink-500 fill-pink-500/20" />} />

      {/* ── Buscador + Ordenamiento (Corregido) ── */}
      <div className="px-5 mt-2 flex gap-2.5 h-[48px]"> {/* 👈 Altura fija para igualarlos */}
        
        <div className="flex-1 relative h-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar favoritos…"
            className="w-full h-full bg-tg-text/[0.03] border-2 border-tg-border/40 rounded-[16px] pl-10 pr-4 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none focus:border-tg-accent/40 transition-colors shadow-inner"
          />
        </div>

        <button
          onClick={() => {
            haptic?.impactOccurred('light');
            setSort((s) => SORT_OPTIONS[(SORT_OPTIONS.findIndex((o) => o.key === s) + 1) % SORT_OPTIONS.length].key);
          }}
          className="h-full px-4 bg-tg-secondary border border-tg-border/50 rounded-[16px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-tg-text/[0.02] flex-shrink-0"
        >
          <ArrowUpDown size={15} className="text-tg-accent" />
          <span className="text-[13px] font-bold text-tg-text">{SORT_OPTIONS.find((o) => o.key === sort)?.label}</span>
        </button>
      </div>

      {/* ── Trending Commands ── */}
      {trending.length > 0 && !search && (
        <section className="mt-6">
          <div className="flex items-center gap-2 px-6 mb-3">
            <TrendingUp size={14} className="text-orange-400" />
            <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-widest">Trending esta semana</h2>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {trending.map((t, i) => {
              const cmd = findCommand(t.command);
              // const cat = cmd ? CATEGORY_META[cmd.category] : undefined; // unused
              return (
                <button
                  key={t.command}
                  onClick={() => go(t.command)}
                  className="flex-shrink-0 bg-tg-secondary border border-tg-border/50 rounded-[16px] px-4 py-3 min-w-[120px] text-left active:scale-[0.96] transition-transform shadow-sm hover:bg-tg-text/[0.02] group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-black text-orange-400">#{i + 1}</span>
                    <Flame size={12} className="text-orange-400/60" />
                  </div>
                  <div className="text-[14px] font-bold text-tg-text font-mono tracking-tight truncate">/{t.command}</div>
                  <div className="text-[11px] font-medium text-tg-hint mt-0.5">{t.count} favs</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Loading state ── */}
      {initialLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-tg-accent" />
        </div>
      )}

      {/* ── Lista de Comandos ── */}
      {!initialLoading && (
        <section className="mt-6 px-5">
          <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-widest mb-3 px-1">
            Todos ({total})
          </h2>

          {sorted.length > 0 ? (
            <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
              <div className="divide-y divide-tg-border/50">
                {sorted.map((fav) => {
                  const cmd = findCommand(fav.command);
                  if (!cmd) return null;
                  const slug = cmdSlug(cmd);
                  const cat = CATEGORY_META[cmd.category];
                  const CatIcon = cat?.icon;
                  const isComponent = typeof CatIcon !== 'string';

                  return (
                    <div key={slug} className="flex items-center justify-between p-4 transition-colors hover:bg-tg-text/[0.02] group">

                      {/* Área clickeable principal */}
                      <button
                        onClick={() => go(slug)}
                        className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-105"
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
                            <span className="text-[15px] font-bold text-tg-text font-mono tracking-tight truncate">/{slug}</span>
                            {fav.pinned && <Pin size={12} className="text-tg-accent flex-shrink-0" />}
                          </div>
                          <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5">{cmd.description}</div>
                        </div>
                      </button>

                      {/* Acciones */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 pl-3">
                        <button
                          onClick={() => handlePin(slug)}
                          className={`w-8 h-8 rounded-[10px] border flex items-center justify-center active:scale-90 transition-all ${
                            fav.pinned
                              ? 'bg-tg-accent/10 border-tg-accent/30'
                              : 'bg-tg-text/[0.04] border-tg-border/30 hover:bg-tg-text/[0.08]'
                          }`}
                          title={fav.pinned ? 'Desfijar' : 'Fijar'}
                        >
                          <Pin size={14} className={fav.pinned ? 'text-tg-accent' : 'text-tg-hint/70'} />
                        </button>

                        <button
                          onClick={() => handleRemove(slug)}
                          className="w-8 h-8 rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center active:scale-90 transition-all hover:bg-red-500/20"
                          title="Eliminar de favoritos"
                        >
                          <HeartOff size={14} className="text-red-400" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Estado Vacío ── */
            <div className="text-center py-16 bg-tg-secondary border border-tg-border/50 rounded-[20px] shadow-sm px-5">
              <div className="w-16 h-16 mx-auto bg-tg-text/[0.03] border border-tg-border/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Star size={32} className="text-tg-hint/30" />
              </div>
              <p className="text-[16px] font-extrabold text-tg-text tracking-tight">Sin resultados</p>
              <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                {search ? 'No encontramos ningún comando que coincida con tu búsqueda.' : 'Aún no tienes comandos guardados en tus favoritos.'}
              </p>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-tg-accent" />
            </div>
          )}
        </section>
      )}

    </div>
  );
}