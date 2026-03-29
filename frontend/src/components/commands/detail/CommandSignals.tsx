import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, Flame, MessageCircle, TrendingUp } from 'lucide-react';
import { fetchCommandSignals } from '../../../services/commandStatsApi';

interface Props {
  slug: string;
}

function CommandSignals({ slug }: Props) {
  const { t } = useTranslation('commandDetail');

  const { data } = useQuery({
    queryKey: ['command-signals', slug],
    queryFn: () => fetchCommandSignals(slug),
    enabled: !!slug,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (!data) return null;

  const { activeUsersNow, trendingScore, regionTrend, discussionsCount, trendDelta } = data;
  const showAnything = activeUsersNow > 0 || regionTrend || discussionsCount > 0;
  const isHot = trendingScore > 2;

  if (!showAnything) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="flex flex-wrap items-center gap-2 px-5 mt-3"
    >
      {activeUsersNow > 0 && (
        <div className="flex items-center gap-1.5 bg-tg-secondary/80 border border-tg-border/30 rounded-full px-2.5 py-1">
          <Eye size={12} className="text-tg-accent" />
          <span className="text-[11px] font-semibold text-tg-text/80">
            {t('users_using_now', '{{count}} using now', { count: activeUsersNow })}
          </span>
          {trendDelta > 0 && (
            <span className="text-[10px] font-bold text-emerald-500">+{trendDelta}</span>
          )}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
      )}

      {isHot && (
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1"
        >
          <TrendingUp size={12} className="text-red-500" />
          <span className="text-[11px] font-bold text-red-500">
            {t('signals_hot')}
          </span>
        </motion.div>
      )}

      {regionTrend && (
        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
          <Flame size={12} className="text-orange-500" />
          <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
            {t('trending_region', 'Trending in your region')}
          </span>
        </div>
      )}

      {discussionsCount > 0 && (
        <div className="flex items-center gap-1.5 bg-tg-secondary/80 border border-tg-border/30 rounded-full px-2.5 py-1">
          <MessageCircle size={12} className="text-tg-accent" />
          <span className="text-[11px] font-semibold text-tg-text/80">
            {t('active_discussions', '{{count}} discussions', { count: discussionsCount })}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default memo(CommandSignals);
