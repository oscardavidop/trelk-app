import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommandStatsData } from '../../../services/commandStatsApi';

interface Props {
  stats: CommandStatsData;
}

const card = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const statColors: Record<string, string> = {
  rating: 'rgba(245,158,11,0.15)',
  weekly: 'rgba(36,139,218,0.15)',
  favorites: 'rgba(251,113,133,0.15)',
};

function CommandStatsRow({ stats }: Props) {
  const { t } = useTranslation('commandDetail');

  const items = [
    { key: 'rating', icon: Star, value: stats.rating.toFixed(1), label: t('rating'), accent: 'text-amber-500', glow: statColors.rating },
    { key: 'weekly', icon: Flame, value: fmt(stats.weeklyUses), label: t('weekly'), accent: 'text-tg-accent', glow: statColors.weekly },
    { key: 'favorites', icon: Heart, value: fmt(stats.favorites), label: t('favorites_label'), accent: 'text-rose-400', glow: statColors.favorites },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-2.5 px-5"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={card}
          className="relative bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 rounded-[20px] p-3 flex flex-col items-center justify-center text-center shadow-sm overflow-hidden group"
        >
          {/* Subtle glow */}
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-40" style={{ background: item.glow }} />
          {/* Top shine */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />

          <div className="w-[34px] h-[34px] rounded-[12px] bg-tg-text/[0.04] border border-tg-border/25 flex items-center justify-center mb-2 relative z-10">
            <item.icon size={16} className={item.accent} />
          </div>
          <div className="text-[17px] font-bold text-tg-text leading-none mb-0.5 relative z-10">
            {item.value}
          </div>
          <div className="text-[9px] font-bold text-tg-hint uppercase tracking-wider relative z-10">
            {item.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default memo(CommandStatsRow);
