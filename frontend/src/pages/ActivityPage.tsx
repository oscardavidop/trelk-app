import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHideIsland } from '../hooks/useHideIsland';
import ActivityItem from '../components/activity/ActivityItem';
import XPProgress from '../components/XPProgress';
import { Activity, Clock, Flame, Star, Trophy, Loader2 } from 'lucide-react';
import {
  fetchHistory,
  fetchActivityStats,
  type HistoryEntry,
  type ActivityStats,
} from '../services/historyApi';
import StickyHeader from '@/components/StickyHeader';
import { SkeletonListItem } from '../components/skeletons/SkeletonListItem';

const PAGE_SIZE = 20;

export default function ActivityPage() {
  useHideIsland();
  const { t } = useTranslation('activity');

  // ── History state (infinite scroll) ──
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // ── Activity stats ──
  const [stats, setStats] = useState<ActivityStats | null>(null);

  // ── Sentinel ref for IntersectionObserver ──
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Load history page ──
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await fetchHistory(PAGE_SIZE, offset);
      setHistory((prev) => {
        // Deduplicate by _id
        const ids = new Set(prev.map((e) => e._id));
        const next = data.items.filter((e) => !ids.has(e._id));
        return [...prev, ...next];
      });
      setOffset(data.nextOffset);
      setHasMore(data.hasMore);
    } catch {
      // Silently fail — user can scroll again to retry
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [offset, hasMore, loading]);

  // ── Initial load ──
  useEffect(() => {
    loadMore();
    fetchActivityStats().then(setStats).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── IntersectionObserver for infinite scroll ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // ── Group by day ──
  const grouped = useMemo(() => {
    const dayLabel = (iso: string): string => {
      const d = new Date(iso);
      const today = new Date();
      const yesterday = new Date(Date.now() - 86_400_000);
      if (d.toDateString() === today.toDateString()) return t('common:today');
      if (d.toDateString() === yesterday.toDateString()) return t('common:yesterday');
      return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
    };
    const map = new Map<string, HistoryEntry[]>();
    for (const e of history) {
      const key = dayLabel(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [history, t]);

  return (
    <div className="pb-24 animate-fade-in relative">

      {/* ── Header ── */}
      <StickyHeader title={t('title')} subtitle={t('subtitle')} icon={<div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
        <Activity className="w-6 h-6 text-blue-400" />
      </div>} />
      {/* ── XP Card ── */}
      <div className="px-5 mb-5 animate-slide-up m-4">
        <XPProgress compact />
      </div>

      {/* ── 📊 Resumen de actividad ── */}
      <div className="px-5 mb-5 animate-slide-up" style={{ animationDelay: '30ms' }}>
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-2.5 px-1">{t('summary')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mb-2">
              <Flame size={16} className="text-orange-500" />
            </div>
            <div className="text-[22px] font-black text-tg-text leading-none tabular-nums">
              {stats ? stats.commandsToday : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase  mt-1.5">{t('commands_today')}</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center mb-2">
              <Star size={16} className="text-pink-500" />
            </div>
            <div className="text-[22px] font-black text-tg-text leading-none tabular-nums">
              {stats ? stats.favoritesTotal : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase  mt-1.5">{t('favorites')}</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
              <Trophy size={16} className="text-amber-500" />
            </div>
            <div className="text-[22px] font-black text-tg-text leading-none tabular-nums">
              {stats ? stats.achievementsTotal : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase  mt-1.5">{t('achievements')}</div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        {initialLoad ? (
          /* ── Skeleton loaders ── */
          <div className="px-5 space-y-3">
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          </div>
        ) : grouped.length > 0 ? (
          <>
            {grouped.map(([label, entries]) => (
              <section key={label} className="mb-6">
                <div className="px-6 mb-2">
                  <h2 className="text-[12px] font-bold text-tg-hint uppercase ">{label}</h2>
                </div>
                <div className="mx-5 bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
                  <div className="divide-y divide-white/5">
                    {entries.map((e) => (
                      <ActivityItem key={e._id} entry={e} />
                    ))}
                  </div>
                </div>
              </section>
            ))}

            {/* ── Loading indicator ── */}
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="text-tg-accent animate-spin" />
              </div>
            )}

            {/* ── End of list ── */}
            {!hasMore && history.length > 0 && (
              <div className="text-center py-6">
                <p className="text-[12px] font-medium text-tg-hint/60">{t('no_more')}</p>
              </div>
            )}

            {/* ── Sentinel for IntersectionObserver ── */}
            <div ref={sentinelRef} className="h-1" />
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4 shadow-sm">
              <Clock size={32} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-bold text-tg-text ">{t('no_activity')}</p>
            <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              {t('no_activity_desc')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}