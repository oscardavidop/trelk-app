import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHideIsland } from '../hooks/useHideIsland';
import ActivityItem from '../components/activity/ActivityItem';
import XPProgress from '../components/XPProgress';
import SmartEmptyState from '../components/SmartEmptyState';
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
      if (d.toDateString() === today.toDateString()) return t('common:today', 'Today');
      if (d.toDateString() === yesterday.toDateString()) return t('common:yesterday', 'Yesterday');
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
    <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto">

      {/* ── Header ── */}
      <StickyHeader 
        title={t('title')} 
        subtitle={t('subtitle')} 
        icon={
          <div className="w-[42px] h-[42px] rounded-[14px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
        } 
      />
      
      {/* ── XP Card ── */}
      <div className="px-5 mb-6 mt-4 animate-slide-up">
        <XPProgress compact />
      </div>

      {/* ── 📊 Resumen de actividad ── */}
      <div className="px-5 mb-8 animate-slide-up" style={{ animationDelay: '30ms' }}>
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('summary')}</h2>
        <div className="grid grid-cols-3 gap-3">
          
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-[38px] h-[38px] rounded-[12px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-2.5 shadow-sm">
              <Flame size={18} className="text-orange-500" />
            </div>
            <div className="text-[20px] font-bold text-tg-text leading-none tabular-nums mb-1">
              {stats ? stats.commandsToday : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('commands_today')}</div>
          </div>
          
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-[38px] h-[38px] rounded-[12px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-2.5 shadow-sm">
              <Star size={18} className="text-pink-500" />
            </div>
            <div className="text-[20px] font-bold text-tg-text leading-none tabular-nums mb-1">
              {stats ? stats.favoritesTotal : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('favorites')}</div>
          </div>
          
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="w-[38px] h-[38px] rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2.5 shadow-sm">
              <Trophy size={18} className="text-amber-500" />
            </div>
            <div className="text-[20px] font-bold text-tg-text leading-none tabular-nums mb-1">
              {stats ? stats.achievementsTotal : '—'}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('achievements')}</div>
          </div>
          
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        {initialLoad ? (
          /* ── Skeleton loaders ── */
          <div className="px-5 space-y-3">
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
              <div className="divide-y divide-tg-border/20">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonListItem key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : grouped.length > 0 ? (
          <>
            {grouped.map(([label, entries]) => (
              <section key={label} className="mb-6">
                <div className="px-6 mb-2.5">
                  <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider">{label}</h2>
                </div>
                <div className="mx-5 bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm">
                  <div className="divide-y divide-tg-border/20">
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
                <p className="text-[13px] font-medium text-tg-hint/70">{t('no_more', 'No more activity')}</p>
              </div>
            )}

            {/* ── Sentinel for IntersectionObserver ── */}
            <div ref={sentinelRef} className="h-1" />
          </>
        ) : (
          /* ── Empty state ── */
          <SmartEmptyState context="activity" title={t('no_activity')} description={t('no_activity_desc')} />
        )}
      </div>

    </div>
  );
}