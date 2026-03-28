import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, MessageSquare, CheckCircle2, XCircle, RotateCcw,
  Tag, UserPlus, UserMinus, Pencil, Trash2, Loader2, Clock,
} from 'lucide-react';
import { fetchReportTimeline, type ReportTimelineEvent } from '../../services/commandStatsApi';

const ACTION_CONFIG: Record<string, {
  icon: typeof GitBranch;
  color: string;
  bgColor: string;
  labelKey: string;
}> = {
  opened:          { icon: GitBranch,      color: '#10b981', bgColor: 'bg-emerald-500/10', labelKey: 'event_opened' },
  closed:          { icon: CheckCircle2,   color: '#8b5cf6', bgColor: 'bg-violet-500/10',  labelKey: 'event_closed' },
  reopened:        { icon: RotateCcw,      color: '#f59e0b', bgColor: 'bg-amber-500/10',   labelKey: 'event_reopened' },
  commented:       { icon: MessageSquare,  color: '#3b82f6', bgColor: 'bg-blue-500/10',    labelKey: 'event_commented' },
  assigned:        { icon: UserPlus,       color: '#06b6d4', bgColor: 'bg-cyan-500/10',    labelKey: 'event_assigned' },
  unassigned:      { icon: UserMinus,      color: '#64748b', bgColor: 'bg-slate-500/10',   labelKey: 'event_unassigned' },
  labeled:         { icon: Tag,            color: '#ec4899', bgColor: 'bg-pink-500/10',    labelKey: 'event_labeled' },
  unlabeled:       { icon: Tag,            color: '#64748b', bgColor: 'bg-slate-500/10',   labelKey: 'event_unlabeled' },
  edited:          { icon: Pencil,         color: '#64748b', bgColor: 'bg-slate-500/10',   labelKey: 'event_edited' },
  comment_edited:  { icon: Pencil,         color: '#64748b', bgColor: 'bg-slate-500/10',   labelKey: 'event_comment_edited' },
  comment_deleted: { icon: Trash2,         color: '#ef4444', bgColor: 'bg-red-500/10',     labelKey: 'event_comment_deleted' },
};

const DEFAULT_CONFIG = { icon: GitBranch, color: '#64748b', bgColor: 'bg-slate-500/10', labelKey: 'event_unknown' };

interface Props {
  reportId: string;
  initialCreatedAt?: number;
}

function ReportTimeline({ reportId, initialCreatedAt }: Props) {
  const { t } = useTranslation('reports');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-timeline', reportId],
    queryFn: () => fetchReportTimeline(reportId),
    staleTime: 30_000,
    enabled: !!reportId,
  });

  const events = data?.items ?? [];

  // Group events by date
  const grouped = useMemo(() => {
    const groups: { date: string; events: ReportTimelineEvent[] }[] = [];
    let currentDate = '';

    for (const ev of events) {
      const dateStr = new Date(ev.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, events: [] });
      }
      groups[groups.length - 1].events.push(ev);
    }

    return groups;
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-tg-hint">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-[13px] font-medium">{t('timeline_loading', 'Loading timeline...')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-8 text-tg-hint/60">
        <span className="text-[13px]">{t('timeline_error', 'Could not load timeline')}</span>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-tg-hint/60">
        <Clock size={20} className="mb-2 opacity-40" />
        <span className="text-[13px]">{t('timeline_empty', 'No activity yet')}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline spine */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-tg-accent/30 via-tg-border/20 to-transparent" />

      <AnimatePresence initial={false}>
        {grouped.map((group, gi) => (
          <div key={group.date}>
            {/* Date header */}
            <div className="relative flex items-center gap-3 mb-3 mt-4 first:mt-0">
              <div className="w-[31px] flex justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-tg-hint/30" />
              </div>
              <span className="text-[11px] font-bold text-tg-hint uppercase tracking-wider">
                {group.date}
              </span>
            </div>

            {/* Events in group */}
            {group.events.map((ev, ei) => (
              <TimelineEvent
                key={ev.id}
                event={ev}
                t={t}
                delay={gi * 0.05 + ei * 0.03}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const TimelineEvent = memo(function TimelineEvent({
  event,
  t,
  delay,
}: {
  event: ReportTimelineEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  delay: number;
}) {
  const config = ACTION_CONFIG[event.action] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const timeStr = new Date(event.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(delay, 0.4) }}
      className="relative flex gap-3 mb-3 group"
    >
      {/* Icon dot */}
      <div className="flex-shrink-0 w-[31px] flex justify-center z-10">
        <div
          className={`w-[26px] h-[26px] rounded-full ${config.bgColor} border border-current/10 flex items-center justify-center`}
          style={{ borderColor: `${config.color}20` }}
        >
          <Icon size={12} style={{ color: config.color }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-tg-text">
            @{event.actor.username}
          </span>
          <span className="text-[12px] text-tg-hint/80">
            {t(config.labelKey, event.action)}
          </span>
          {event.content && event.action !== 'commented' && (
            <span className="text-[12px] font-semibold text-tg-accent truncate">
              {event.content}
            </span>
          )}
        </div>

        {/* Comment body */}
        {event.action === 'commented' && event.content && (
          <div className="mt-1.5 p-3 bg-tg-secondary/60 border border-tg-border/30 rounded-[12px] text-[13px] text-tg-text/90 leading-relaxed whitespace-pre-wrap break-words">
            {event.content.length > 500 ? event.content.slice(0, 500) + '…' : event.content}
          </div>
        )}

        {/* Label badge */}
        {(event.action === 'labeled' || event.action === 'unlabeled') && (event.metadata as Record<string, string>)?.labelColor && (
          <div className="mt-1 inline-flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: `#${(event.metadata as Record<string, string>).labelColor}` }}
            />
            <span className="text-[11px] font-semibold text-tg-text/70">
              {event.content}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-tg-hint/50 mt-1 font-medium">{timeStr}</p>
      </div>
    </motion.div>
  );
});

export default memo(ReportTimeline);
