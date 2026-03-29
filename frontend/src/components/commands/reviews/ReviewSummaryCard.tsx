import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquarePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReviewsSummary } from '../../../services/commandStatsApi';

interface Props {
  summary: ReviewsSummary;
  onFilterStar?: (star: number | null) => void;
  activeStar?: number | null;
}

const springPop = { type: 'spring' as const, stiffness: 400, damping: 22 };

function ReviewSummaryCard({ summary, onFilterStar, activeStar }: Props) {
  const { t } = useTranslation('commandDetail');
  const { avgRating, totalReviews, distribution } = summary;
  const maxCount = Math.max(...Object.values(distribution), 1);

  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
    return n.toLocaleString();
  };

  if (totalReviews === 0) {
    return (
      <section className="px-5 mt-6">
        <div className="relative overflow-hidden rounded-[22px] border-2 border-dashed border-tg-accent/30 bg-gradient-to-br from-tg-accent/[0.06] via-transparent to-amber-500/[0.04] p-7 text-center">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-tg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.8, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={springPop}
            className="relative z-10"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center">
              <MessageSquarePlus size={26} className="text-tg-accent" />
            </div>

            <div className="flex justify-center gap-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springPop, delay: n * 0.06 }}
                >
                  <Star size={22} className="text-amber-500/25" />
                </motion.div>
              ))}
            </div>

            <h3 className="text-[17px] font-bold text-tg-text mb-1.5">{t('reviews_no_reviews')}</h3>
            <p className="text-[13px] text-tg-hint leading-relaxed max-w-[260px] mx-auto">{t('reviews_be_first')}</p>

            <div className="mt-4 h-[3px] w-16 mx-auto rounded-full bg-gradient-to-r from-tg-accent/40 via-tg-accent to-tg-accent/40" />
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 mt-6">
      <h3 className="text-[15px] font-bold text-tg-text mb-3">{t('reviews_title')}</h3>
      <div className="bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 shadow-sm">
        <div className="flex items-start gap-5">
          {/* Left: big rating */}
          <div className="flex flex-col items-center min-w-[80px]">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[44px] font-bold leading-none text-tg-text tabular-nums"
            >
              {avgRating.toFixed(1)}
            </motion.span>
            <div className="flex gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const fill = Math.min(Math.max(avgRating - n + 1, 0), 1);
                return (
                  <div key={n} className="relative w-[14px] h-[14px]">
                    <Star size={14} className="text-tg-hint/20 absolute inset-0" />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] text-tg-hint mt-1.5 tabular-nums">
              {formatCount(totalReviews)}
            </span>
          </div>

          {/* Right: distribution bars */}
          <div className="flex-1 flex flex-col gap-[6px] pt-1">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = distribution[star];
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              const barPct = totalReviews > 0 ? (count / maxCount) * 100 : 0;
              const isActive = activeStar === star;
              return (
                <button
                  key={star}
                  className={`flex items-center gap-2 group transition-all duration-150 rounded-md -mx-1 px-1 ${
                    onFilterStar ? 'cursor-pointer active:scale-[0.98]' : ''
                  } ${isActive ? 'bg-tg-accent/10' : ''}`}
                  onClick={() => onFilterStar?.(isActive ? null : star)}
                  type="button"
                >
                  <span className="text-[12px] text-tg-hint w-[10px] text-right tabular-nums">{star}</span>
                  <div className="flex-1 h-[8px] bg-tg-hint/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.6, delay: (5 - star) * 0.08, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: star >= 4
                          ? 'linear-gradient(90deg, #34C759, #30D158)'
                          : star === 3
                            ? 'linear-gradient(90deg, #FF9500, #FFCC00)'
                            : 'linear-gradient(90deg, #FF3B30, #FF6961)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-tg-hint/60 w-[30px] text-right tabular-nums font-medium">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ReviewSummaryCard);
