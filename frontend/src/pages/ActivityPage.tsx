import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHideIsland } from '../hooks/useHideIsland';
import ActivityItem from '../components/activity/ActivityItem';
import XPProgress from '../components/XPProgress';
import SmartEmptyState from '../components/SmartEmptyState';
import { Activity, Clock, Flame, Star, Trophy, Loader2, Trash2, CheckSquare, X } from 'lucide-react';
import {
  fetchHistory,
  fetchActivityStats,
  deleteHistoryEntries,
  deleteAllHistory,
  undoHistoryDelete,
  type HistoryEntry,
  type ActivityStats,
} from '../services/historyApi';
import StickyHeader from '@/components/StickyHeader';
import { SkeletonListItem } from '../components/skeletons/SkeletonListItem';
import { useToastStore } from '../stores';
import { useUndoStore } from '../hooks/useUndo';

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

  // ── Selection mode ──
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToastStore();
  const undoStore = useUndoStore();

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
    setConfirmDeleteAll(false);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0 || deleting) return;
    setDeleting(true);
    const ids = Array.from(selected);
    const removedEntries = history.filter((e) => selected.has(e._id));
    try {
      const result = await deleteHistoryEntries(ids);
      setHistory((prev) => prev.filter((e) => !selected.has(e._id)));
      exitSelectMode();

      if (result.status === 'pending_delete') {
        undoStore.push({
          id: result.jobId,
          message: t('deleted'),
          icon: 'trash',
          duration: 6000,
          onUndo: async () => {
            await undoHistoryDelete(ids);
            setHistory((prev) => [...removedEntries, ...prev].sort((a, b) => b.timestamp - a.timestamp));
          },
        });
      }
    } catch { /* silent */ } finally { setDeleting(false); }
  }, [selected, deleting, exitSelectMode, history, undoStore, t]);

  const handleDeleteAll = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await deleteAllHistory();
      setHistory([]);
      setHasMore(false);
      exitSelectMode();
      setConfirmDeleteAll(false);

      if (result.status === 'pending_delete') {
        undoStore.push({
          id: result.jobId,
          message: t('deleted'),
          icon: 'trash',
          duration: 6000,
          onUndo: async () => {
            await undoHistoryDelete(undefined, result.jobId);
            // Reload fresh data
            const data = await fetchHistory(PAGE_SIZE, 0);
            setHistory(data.items);
            setOffset(data.nextOffset);
            setHasMore(data.hasMore);
            fetchActivityStats().then(setStats);
          },
        });
      }
    } catch { /* silent */ } finally { setDeleting(false); }
  }, [deleting, exitSelectMode, undoStore, t]);

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
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();
    const weekAgo = Date.now() - 7 * 86_400_000;

    const dayLabel = (ts: number): string => {
      const d = new Date(ts);
      if (d.toDateString() === todayStr) return t('common:today', 'Today');
      if (d.toDateString() === yesterdayStr) return t('common:yesterday', 'Yesterday');
      if (ts >= weekAgo) return t('activity:this_week', 'This week');
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const map = new Map<string, HistoryEntry[]>();
    for (const e of history) {
      const key = dayLabel(e.timestamp);
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

      
      {/* ── Action bar (select / delete all) ── */}
      {!initialLoad && history.length > 0 && (
        <div className="px-5 mt-3 flex items-center justify-end gap-2">
          {selectMode ? (
            <>
              <button onClick={exitSelectMode} className="flex items-center gap-1.5 text-[12px] font-bold text-tg-hint px-3 py-1.5 rounded-full bg-tg-hint/8 active:bg-tg-hint/15 transition-colors">
                <X size={14} /> {t('cancel')}
              </button>
              {selected.size > 0 && (
                <button onClick={handleDeleteSelected} disabled={deleting} className="flex items-center gap-1.5 text-[12px] font-bold text-red-400 px-3 py-1.5 rounded-full bg-red-500/8 border border-red-500/15 active:bg-red-500/15 transition-colors disabled:opacity-50">
                  <Trash2 size={13} /> {t('delete_selected')} ({selected.size})
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setSelectMode(true)} className="flex items-center gap-1.5 text-[12px] font-bold text-tg-hint px-3 py-1.5 rounded-full bg-tg-hint/8 active:bg-tg-hint/15 transition-colors">
                <CheckSquare size={13} /> {t('select')}
              </button>
              {confirmDeleteAll ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-red-400">{t('confirm_delete_all')}</span>
                  <button onClick={handleDeleteAll} disabled={deleting} className="text-[12px] font-bold text-red-400 px-3 py-1.5 rounded-full bg-red-500/8 border border-red-500/15 active:bg-red-500/15 transition-colors disabled:opacity-50">
                    {t('confirm')}
                  </button>
                  <button onClick={() => setConfirmDeleteAll(false)} className="text-[12px] font-bold text-tg-hint px-2 py-1.5">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteAll(true)} className="flex items-center gap-1.5 text-[12px] font-bold text-red-400 px-3 py-1.5 rounded-full bg-red-500/8 border border-red-500/15 active:bg-red-500/15 transition-colors">
                  <Trash2 size={13} /> {t('delete_all')}
                </button>
              )}
            </>
          )}
        </div>
      )}

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
                      <ActivityItem
                        key={e._id}
                        entry={e}
                        selectMode={selectMode}
                        isSelected={selected.has(e._id)}
                        onToggleSelect={() => toggleSelect(e._id)}
                        onLongPress={() => { if (!selectMode) { setSelectMode(true); setSelected(new Set([e._id])); } }}
                      />
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