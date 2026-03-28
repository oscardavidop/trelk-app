import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useHideIsland } from '../hooks/useHideIsland';
import StickyHeader from '@/components/StickyHeader';
import ReportTimeline from '@/components/reports/ReportTimeline';
import { fetchMyReports, type UserReport } from '../services/commandStatsApi';
import { Flag, Clock, ChevronRight, ChevronDown, Loader2, FileText, ExternalLink, BugIcon, ServerCrashIcon, GitBranch } from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  reviewed: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
};

const CATEGORY_KEYS: Record<string, string> = {
  bug: 'cat_bug',
  wrong_result: 'cat_wrong_result',
  crash: 'cat_crash',
  other: 'cat_other',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  bug: <BugIcon size={15} className="inline-block mr-0.5 " />,
  wrong_result: <BugIcon size={15} className="inline-block mr-0.5" />,
  crash: <ServerCrashIcon size={15} className="inline-block mr-0.5" />,
  other: <FileText size={15} className="inline-block mr-0.5" />,
};

function useTimeAgo(t: (key: string, opts?: Record<string, unknown>) => string) {
  return (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time_just_now');
    if (mins < 60) return t('time_minutes_ago', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('time_hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('time_days_ago', { count: days });
    return new Date(ts).toLocaleDateString();
  };
}

export default function MyReportsPage() {
  useHideIsland();
  const { t } = useTranslation('reports');
  const timeAgo = useTimeAgo(t);

  const [reports, setReports] = useState<UserReport[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Auto-expand if ?report=id is in URL (from notification deep link)
  useEffect(() => {
    const reportParam = searchParams.get('report');
    if (reportParam && !expandedId) setExpandedId(reportParam);
  }, [searchParams, expandedId]);

  const loadReports = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const data = await fetchMyReports(PAGE_SIZE, offset);
      if (offset === 0) {
        setReports(data.items);
      } else {
        setReports((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          return [...prev, ...data.items.filter((r) => !ids.has(r.id))];
        });
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    loadReports(0);
  }, [loadReports]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadReports(reports.length);
    }
  };

  return (
    <div className="min-h-screen bg-tg-bg">
      <StickyHeader title={t('title')} />

      {/* Stats bar */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center gap-2 text-[13px] text-tg-hint font-medium">
          <FileText size={14} />
          <span>{t('total_reports')}: <strong className="text-tg-text">{total}</strong></span>
        </div>
      </div>

      {/* Loading skeleton */}
      {initialLoad && (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-tg-secondary rounded-[16px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!initialLoad && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-tg-hint/10 flex items-center justify-center mb-4">
            <Flag size={28} className="text-tg-hint/40" />
          </div>
          <p className="text-[16px] font-bold text-tg-text mb-1">
            {t('no_reports')}
          </p>
          <p className="text-[13px] text-tg-hint max-w-[250px]">
            {t('no_reports_desc')}
          </p>
        </div>
      )}

      {/* Reports list */}
      {!initialLoad && reports.length > 0 && (
        <div className="px-4 space-y-3 pb-24">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;

            return (
              <div
                key={report.id}
                className="bg-tg-secondary rounded-[16px] border border-tg-border/30 overflow-hidden shadow-sm transition-all"
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-tg-hint/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-tg-text font-mono">
                        /{report.command}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[report.status] || STATUS_COLORS.open}`}>
                        {t(`status_${report.status}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-tg-hint">
                        {CATEGORY_ICONS[report.category] || CATEGORY_ICONS.other}
                        {t(CATEGORY_KEYS[report.category] || 'cat_other')}
                      </span>
                      <span className="text-[10px] text-tg-hint/50">·</span>
                      <span className="text-[11px] text-tg-hint/60 flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className={`text-tg-hint/40 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-tg-border/20 animate-scale-in space-y-3">
                    <p className="text-[13px] text-tg-text leading-relaxed">
                      {report.message}
                    </p>

                    {/* GitHub link */}
                    {report.githubIssueUrl && (
                      <a
                        href={report.githubIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-tg-accent hover:underline bg-tg-accent/5 border border-tg-accent/15 rounded-[10px] px-3 py-1.5"
                      >
                        <ExternalLink size={12} />
                        {t('view_on_github')}
                      </a>
                    )}

                    {/* Timeline section */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch size={13} className="text-tg-hint/60" />
                        <h3 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">
                          {t('timeline', 'Timeline')}
                        </h3>
                      </div>
                      <ReportTimeline reportId={report.id} initialCreatedAt={report.createdAt} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-3 text-[13px] font-semibold text-tg-accent flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t('load_more')
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
