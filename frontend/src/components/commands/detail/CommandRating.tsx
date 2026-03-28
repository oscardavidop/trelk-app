import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  rating: number;
  hasRated: boolean;
  ratingLoading: boolean;
  onRate: (n: number) => void;
}

function CommandRating({ rating, hasRated, ratingLoading, onRate }: Props) {
  const { t } = useTranslation('commandDetail');

  return (
    <section className="px-5 mt-8">
      <div className="bg-tg-secondary/80 backdrop-blur-sm rounded-[24px] border border-tg-border/40 p-5 text-center shadow-sm relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />

        <AnimatePresence mode="wait">
          {hasRated ? (
            <motion.div
              key="rated"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-2 relative z-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-[52px] h-[52px] mx-auto bg-amber-500/10 rounded-[16px] flex items-center justify-center mb-3"
              >
                <Star size={28} className="text-amber-500 fill-amber-500" />
              </motion.div>
              <p className="text-[16px] font-bold text-tg-text mb-1">{t('thanks_rating')}</p>
              <p className="text-[13px] font-medium text-tg-hint">
                {t('you_rated', { count: rating })}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="unrated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <p className="text-[15px] font-semibold text-tg-text mb-4">{t('rate_question')}</p>
              <div className="flex justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.85 }}
                    disabled={ratingLoading}
                    onClick={() => onRate(n)}
                    className="w-12 h-12 rounded-[14px] bg-tg-hint/5 border border-tg-border/30 flex items-center justify-center disabled:opacity-50 group transition-colors hover:bg-amber-500/10 hover:border-amber-500/30"
                    title={t('rate_stars', { count: n })}
                  >
                    <Star
                      size={24}
                      className={`transition-colors duration-200 ${
                        n <= rating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-tg-hint/40 group-hover:text-amber-500/50'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default memo(CommandRating);
