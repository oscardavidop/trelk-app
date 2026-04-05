import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfidenceLabel from '../../ui/ConfidenceLabel';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchReviewSummaryText } from '../../../services/commandStatsApi';

interface Props {
  command: string;
}

const staggerList = {
  animate: { transition: { staggerChildren: 0.03 } }, // más rápido
};

const fadeSlide = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

function ReviewAISummary({ command }: Props) {
  const { t } = useTranslation('commandDetail');

  const { data, isLoading } = useQuery({
    queryKey: ['review-summary-text', command],
    queryFn: () => fetchReviewSummaryText(command),
    staleTime: 10 * 60_000,
  });

  const [collapsed, setCollapsed] = useState(true);

  /* ── Skeleton ── */
  if (isLoading) {
    return (
      <div className="mx-5 mt-5">
        <div className="rounded-2xl bg-tg-section-bg border border-tg-text/[0.04] p-5 space-y-4 animate-pulse">
          <div className="h-3 w-32 bg-tg-text/[0.05] rounded" />
          <div className="h-3 w-full bg-tg-text/[0.05] rounded" />
        </div>
      </div>
    );
  }

  if (!data?.text) {
    if (data === undefined) return null;
    return (
      <div className="mx-5 mt-5">
        <div className="rounded-2xl bg-tg-section-bg border border-tg-text/[0.04] p-5">
          <div className="flex items-center gap-3 text-tg-text/40">
            <motion.div
            // pulse animation for the sparkles icon
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <Sparkles size={16} />
            </motion.div>
            <span className="text-[13px]">
              {t('reviews_ai_generating')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const total = (data.positiveCount || 0) + (data.negativeCount || 0);
  const positiveRatio =
    total > 0
      ? Math.round(((data.positiveCount || 0) / total) * 100)
      : 50;

  const updatedAgo = data.updatedAt
    ? formatTimeAgo(data.updatedAt, t)
    : null;

  const sentimentEmoji =
    data.sentiment === 'positive'
      ? '😊'
      : data.sentiment === 'negative'
      ? '😟'
      : '😐';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-5"
    >
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 via-tg-accent/10 to-fuchsia-500/15 blur-[1px]" />

        <div className="relative rounded-2xl bg-tg-section-bg/[0.97] backdrop-blur-2xl border border-white/[0.06] m-[1px]">
          <div className="relative z-10 p-5">

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 flex items-center justify-center">
                <Sparkles size={16} className="text-violet-500" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-tg-text">
                    {t('reviews_ai_summary_title')}
                  </span>
                  <span>{sentimentEmoji}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-tg-text/40">
                  <span>{updatedAgo}</span>
                  <span>•</span>
                  <span>
                    {t('reviews_ai_based_on', {
                      count: data.totalReviews,
                    })}
                  </span>
                </div>
              </div>

              {/* COLLAPSE BUTTON */}
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-tg-secondary/60 hover:bg-tg-secondary transition"
              >
                <motion.div
                  animate={{ rotate: collapsed ? 0 : 180 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {/* SUMMARY */}
            <p className="text-[13.5px] text-tg-text/90 mb-3">
              {data.text}
            </p>

            {/* COLLAPSABLE CONTENT (OPTIMIZADO) */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.95 }}
                  transition={{
                    duration: 0.22,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  style={{ transformOrigin: 'top' }}
                  className="overflow-hidden will-change-[transform,opacity]"
                >
                  {/* PROS / CONS */}
                  {(data.pros?.length > 0 || data.cons?.length > 0) && (
                    <div className="flex gap-3 mb-4">
                      {data.pros?.length > 0 && (
                        <motion.div
                          variants={staggerList}
                          animate="animate"
                          className="flex-1 bg-emerald-500/[0.05] p-3 rounded-xl"
                        >
                          <div className="flex items-center gap-1 mb-2">
                            <ThumbsUp size={11} className="text-emerald-500" />
                            <span className="text-[11px] text-emerald-500 font-semibold">
                              Pros
                            </span>
                          </div>

                          {data.pros.map((p, i) => (
                            <motion.div
                              key={i}
                              variants={fadeSlide}
                              className="text-[12px] text-tg-text/70"
                            >
                              • {p}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                      {data.cons?.length > 0 && (
                        <motion.div
                          variants={staggerList}
                          animate="animate"
                          className="flex-1 bg-red-500/[0.05] p-3 rounded-xl"
                        >
                          <div className="flex items-center gap-1 mb-2">
                            <ThumbsDown size={11} className="text-red-400" />
                            <span className="text-[11px] text-red-400 font-semibold">
                              Cons
                            </span>
                          </div>

                          {data.cons.map((c, i) => (
                            <motion.div
                              key={i}
                              variants={fadeSlide}
                              className="text-[12px] text-tg-text/70"
                            >
                              • {c}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* SENTIMENT BAR */}
                  {total > 0 && (
                    <div className="mb-4">
                      <div className="h-1.5 bg-tg-text/[0.05] rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${positiveRatio}%` }}
                          className="bg-emerald-500 h-full"
                        />
                        <div
                          style={{ width: `${100 - positiveRatio}%` }}
                          className="bg-red-400 h-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* TREND */}
                  {data.trend && data.trend !== 'none' && (
                    <div className="text-[12px] mb-3 text-tg-text/70">
                      {data.trendMessage}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* FOOTER */}
            <div className="flex items-center gap-2 pt-2 border-t border-tg-text/[0.05]">
              <ConfidenceLabel
                confidence={data ? {
                  level: data.confidenceLevel as 'high' | 'medium' | 'low',
                  score: data.confidenceScore ?? 0,
                  basedOn: data.totalReviews ?? 0,
                  lastUpdated: data.updatedAt ?? 0,
                  source: 'computed',
                } : null}
                showUpdated={false}
              />

              <div className="flex-1" />

              <Zap size={10} className="text-violet-400" />
              <span className="text-[10px]">AI</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: number, t: any) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return t('reviews_ai_just_now');
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

export default memo(ReviewAISummary);