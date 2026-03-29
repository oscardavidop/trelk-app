import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle,
  Trophy,
  AlertTriangle,
  Sparkles,
  ArrowUp,
  FileText,
  Brain,
  Clock,
  BarChart3,
  RefreshCw,
  Loader2,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useTelegram } from '../hooks/useTelegram';
import type { NotificationItem } from '../services/notificationsApi';

// ── Icon & color mapping ────────────────────────────────────────────────────

const TYPE_ICON: Record<string, typeof Bell> = {
  achievement_unlocked: Trophy,
  review_rejected: AlertTriangle,
  review_approved: CheckCircle,
  new_command: Sparkles,
  command_trending: Sparkles,
  user_level_up: ArrowUp,
  system_alert: BellRing,
  report_resolved: FileText,
  ai_summary_updated: Brain,
  inactivity_reminder: Clock,
  weekly_stats: BarChart3,
};

const TYPE_COLOR: Record<string, string> = {
  achievement_unlocked: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  review_rejected: 'text-red-500 bg-red-500/10 border-red-500/20',
  review_approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  new_command: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  command_trending: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  user_level_up: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  system_alert: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  report_resolved: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
  ai_summary_updated: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  inactivity_reminder: 'text-tg-hint bg-tg-hint/10 border-tg-hint/20',
  weekly_stats: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
};

const DEFAULT_COLOR = 'text-tg-text bg-tg-hint/10 border-tg-border/40';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(
  ts: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('just_now');
  if (mins < 60) return t('min_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hours_ago', { count: hours });
  return t('days_ago', { count: Math.floor(hours / 24) });
}

function resolveText(
  key: string,
  params: Record<string, unknown> | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  return t(key, params as Record<string, unknown> | undefined) || key;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3.5 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-[12px] bg-tg-hint/10 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-tg-hint/10 rounded-full w-3/5" />
        <div className="h-3 bg-tg-hint/10 rounded-full w-4/5" />
        <div className="h-2.5 bg-tg-hint/10 rounded-full w-1/4" />
      </div>
    </div>
  );
}

// ── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onRead,
  onDelete,
  onTap,
  t,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onTap: (item: NotificationItem) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = TYPE_ICON[item.type] || Bell;
  const colorCls = TYPE_COLOR[item.type] || DEFAULT_COLOR;
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-120, -60], [1, 0]);
  const readOpacity = useTransform(x, [60, 120], [0, 1]);
  const dragRef = useRef({ startX: 0 });

  const handleDragStart = (_: unknown, info: PanInfo) => {
    dragRef.current.startX = info.point.x;
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const totalOffset = info.point.x - dragRef.current.startX;
    if (totalOffset < -80) {
      onDelete(item._id);
    } else if (totalOffset > 80 && !item.read) {
      onRead(item._id);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete bg (left swipe) */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-500/90 flex items-center justify-end pr-5"
      >
        <Trash2 size={20} className="text-white" />
      </motion.div>
      {/* Mark read bg (right swipe) */}
      {!item.read && (
        <motion.div
          style={{ opacity: readOpacity }}
          className="absolute inset-0 bg-emerald-500/90 flex items-center pl-5"
        >
          <Check size={20} className="text-white" />
        </motion.div>
      )}

      <motion.div
        layout
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.4}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, height: 0, marginTop: 0, padding: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex items-start gap-3.5 p-4 active:bg-tg-hint/5 transition-colors group cursor-pointer bg-tg-secondary ${!item.read ? 'bg-tg-accent/[0.04]' : ''}`}
        onClick={() => { if (Math.abs(x.get()) < 5) onTap(item); }}
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95 ${colorCls} ${item.read ? 'grayscale opacity-60' : ''}`}
        >
          <Icon size={18} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className={`text-[15px] leading-tight ${item.read ? 'font-medium text-tg-text/70' : 'font-semibold text-tg-text'}`}
          >
            {resolveText(item.titleKey, item.titleParams, t)}
          </p>
          <p
            className={`text-[13px] mt-1 leading-snug ${item.read ? 'text-tg-hint/70' : 'font-medium text-tg-hint/90'}`}
          >
            {resolveText(item.messageKey, item.messageParams, t)}
          </p>
          <p className="text-[11px] font-bold text-tg-hint/50 mt-2 uppercase tracking-wide">
            {relativeTime(item.createdAt, t)}
          </p>
        </div>

        {/* Unread indicator */}
        {!item.read && (
          <div className="w-2.5 h-2.5 rounded-full bg-tg-accent shrink-0 mt-2" />
        )}
      </motion.div>
    </div>
  );
}

// ── Notification Grouping ────────────────────────────────────────────────────

interface NotificationGroup {
  type: 'group';
  groupType: string;
  items: NotificationItem[];
  latestTimestamp: number;
  allRead: boolean;
}

type NotifOrGroup = (NotificationItem & { type: never }) | NotificationGroup;

function isGroup(entry: NotificationItem | NotificationGroup): entry is NotificationGroup {
  return 'type' in entry && (entry as NotificationGroup).type === 'group';
}

function groupNotifications(items: NotificationItem[]): (NotificationItem | NotificationGroup)[] {
  // Group consecutive same-type notifications within 1 hour
  const result: (NotificationItem | NotificationGroup)[] = [];
  const buckets = new Map<string, NotificationItem[]>();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const item of items) {
    const key = item.type;
    const bucket = buckets.get(key);
    if (bucket && Math.abs(item.createdAt - bucket[bucket.length - 1].createdAt) < ONE_HOUR) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  // Re-assemble in order, grouping where 2+ items exist
  const assigned = new Set<string>();
  for (const item of items) {
    if (assigned.has(item._id)) continue;
    const bucket = buckets.get(item.type);
    if (bucket && bucket.length >= 2 && bucket[0]._id === item._id) {
      result.push({
        type: 'group',
        groupType: item.type,
        items: bucket,
        latestTimestamp: bucket[0].createdAt,
        allRead: bucket.every(n => n.read),
      });
      for (const b of bucket) assigned.add(b._id);
    } else if (!assigned.has(item._id)) {
      result.push(item);
      assigned.add(item._id);
    }
  }

  return result;
}

// ── Grouped Notification Row ─────────────────────────────────────────────────

function GroupedNotificationRow({
  group,
  onRead,
  onDelete,
  onTap,
  t,
}: {
  group: NotificationGroup;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onTap: (item: NotificationItem) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICON[group.groupType] || Bell;
  const colorCls = TYPE_COLOR[group.groupType] || DEFAULT_COLOR;
  const first = group.items[0];

  return (
    <div>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3.5 p-4 active:bg-tg-hint/5 transition-colors cursor-pointer ${!group.allRead ? 'bg-tg-accent/[0.04]' : ''}`}
        onClick={() => setExpanded(p => !p)}
      >
        <div className={`relative w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 shadow-sm ${colorCls} ${group.allRead ? 'grayscale opacity-60' : ''}`}>
          <Icon size={18} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-tg-accent text-white text-[10px] font-bold flex items-center justify-center border-2 border-tg-bg">
            {group.items.length}
          </span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-[15px] leading-tight ${group.allRead ? 'font-medium text-tg-text/70' : 'font-semibold text-tg-text'}`}>
            {t('notification_group', { count: group.items.length, type: resolveText(first.titleKey, first.titleParams, t) })}
          </p>
          <p className="text-[13px] mt-1 text-tg-hint/80">
            {group.items.length} {t('updates')}
          </p>
          <p className="text-[11px] font-bold text-tg-hint/50 mt-2 uppercase tracking-wide">
            {relativeTime(group.latestTimestamp, t)}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-tg-hint/50 transition-transform duration-150 shrink-0 mt-3 ${expanded ? 'rotate-180' : ''}`}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden bg-tg-bg/30 divide-y divide-tg-border/10"
          >
            {group.items.map(n => (
              <NotificationRow key={n._id} item={n} onRead={onRead} onDelete={onDelete} onTap={onTap} t={t} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const { userId } = useParams();
  const { haptic } = useTelegram();

  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    loaded,
    page,
    totalPages,
    markRead,
    markAllRead,
    deleteItem,
    loadMore,
    reload,
  } = useNotifications(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via intersection observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, loadMore]);

  const handleMarkRead = useCallback(
    (id: string) => {
      haptic?.impactOccurred('light');
      markRead(id);
    },
    [markRead, haptic],
  );

  const handleMarkAllRead = useCallback(() => {
    haptic?.notificationOccurred('success');
    markAllRead();
  }, [markAllRead, haptic]);

  const handleDelete = useCallback(
    (id: string) => {
      haptic?.impactOccurred('medium');
      deleteItem(id);
    },
    [deleteItem, haptic],
  );

  const handleTap = useCallback(
    (item: NotificationItem) => {
      haptic?.impactOccurred('light');
      if (!item.read) markRead(item._id);
      if (item.link) navigate(item.link);
    },
    [markRead, navigate, haptic],
  );

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);
  const groupedUnread = useMemo(() => groupNotifications(unread), [unread]);
  const groupedRead = useMemo(() => groupNotifications(read), [read]);

  return (
    <main className="pb-28 animate-fade-in relative max-w-[480px] mx-auto min-h-screen">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-tg-bg/85 backdrop-blur-xl border-b border-tg-border/20 px-5 pt-4 pb-3 flex items-center justify-between shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-sm">
            <Bell size={18} className="text-sky-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-tg-text leading-tight tracking-tight">
              {t('title')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-[12px] font-medium text-tg-hint leading-snug">
                {unreadCount} {t('unread')}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="w-9 h-9 rounded-[12px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center text-tg-accent active:scale-90 transition-all shadow-sm"
            aria-label={t('mark_all_read')}
          >
            <CheckCheck size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && !loaded && (
        <div className="px-5 mt-5 space-y-0">
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm divide-y divide-tg-border/20">
            {[1, 2, 3, 4, 5].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center animate-fade-in">
          <div className="w-[72px] h-[72px] rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-sm">
            <AlertTriangle size={32} className="text-red-500/60" />
          </div>
          <p className="text-[17px] font-bold text-tg-text mb-1">{t('error')}</p>
          <button
            onClick={reload}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-tg-accent/10 text-tg-accent border border-tg-accent/20 text-[14px] font-bold active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
            {t('retry')}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {loaded && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center animate-fade-in">
          <div className="w-[72px] h-[72px] rounded-[24px] bg-tg-secondary border border-tg-border/40 flex items-center justify-center mb-5 shadow-sm">
            <Bell size={32} className="text-tg-hint/50" />
          </div>
          <p className="text-[20px] font-bold text-tg-text mb-1">{t('empty')}</p>
          <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[250px] mx-auto">
            {t('empty_desc')}
          </p>
        </div>
      )}

      {/* ── Unread section ── */}
      {loaded && unread.length > 0 && (
        <section className="px-5 mt-5 animate-slide-up">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
            {t('unread')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">
            <AnimatePresence mode="popLayout">
              {groupedUnread.map((entry) =>
                isGroup(entry) ? (
                  <GroupedNotificationRow
                    key={`g-${entry.groupType}-${entry.latestTimestamp}`}
                    group={entry}
                    onRead={handleMarkRead}
                    onDelete={handleDelete}
                    onTap={handleTap}
                    t={t as (key: string, opts?: Record<string, unknown>) => string}
                  />
                ) : (
                  <NotificationRow
                    key={(entry as NotificationItem)._id}
                    item={entry as NotificationItem}
                    onRead={handleMarkRead}
                    onDelete={handleDelete}
                    onTap={handleTap}
                    t={t as (key: string, opts?: Record<string, unknown>) => string}
                  />
                ),
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ── Read section ── */}
      {loaded && read.length > 0 && (
        <section className="px-5 mt-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
            {t('earlier')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20 opacity-80">
            {groupedRead.map((entry) =>
              isGroup(entry) ? (
                <GroupedNotificationRow
                  key={`g-${entry.groupType}-${entry.latestTimestamp}`}
                  group={entry}
                  onRead={handleMarkRead}
                  onDelete={handleDelete}
                  onTap={handleTap}
                  t={t as (key: string, opts?: Record<string, unknown>) => string}
                />
              ) : (
                <NotificationRow
                  key={(entry as NotificationItem)._id}
                  item={entry as NotificationItem}
                  onRead={handleMarkRead}
                  onDelete={handleDelete}
                  onTap={handleTap}
                  t={t as (key: string, opts?: Record<string, unknown>) => string}
                />
              ),
            )}
          </div>
        </section>
      )}

      {/* ── Load more sentinel ── */}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="text-tg-hint animate-spin" />
        </div>
      )}
    </main>
  );
}