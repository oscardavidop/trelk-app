import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, Minus, Star, Trophy, Terminal } from 'lucide-react';
import { fetchWeeklyRecap, type WeeklyRecap } from '@/services/historyApi';
import { MOTION } from '@/design';

export default function ThisWeekCard() {
  const { t } = useTranslation('home');

  const { data: recap, isLoading } = useQuery({
    queryKey: ['weekly-recap'],
    queryFn: fetchWeeklyRecap,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mx-5 rounded-[24px] bg-tg-secondary/40 border border-tg-border/20 p-5 animate-pulse h-[160px] relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    );
  }

  if (!recap || recap.commandsThisWeek === 0) return null;

  const TrendIcon = recap.commandsTrend > 0 ? TrendingUp : recap.commandsTrend < 0 ? TrendingDown : Minus;
  const trendColor = recap.commandsTrend > 0 ? 'text-emerald-500' : recap.commandsTrend < 0 ? 'text-red-400' : 'text-tg-hint';

  return (
    <section className="mt-8 px-5">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Calendar size={14} /> {t('this_week', 'This Week')}
      </h2>

      <div className="rounded-[24px] bg-gradient-to-br from-tg-secondary/80 to-tg-secondary/40 border border-tg-border/30 p-5 shadow-sm relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-tg-accent/5 blur-3xl" />

        {/* Main stat */}
        <div className="flex items-end gap-3 mb-4">
          <div>
            <span className="text-[36px] font-extrabold text-tg-text leading-none tracking-tight">
              {recap.commandsThisWeek}
            </span>
            <span className="text-[13px] text-tg-hint ml-1.5">
              {t('week_commands', 'commands')}
            </span>
          </div>
          <div className={`flex items-center gap-1 mb-1 ${trendColor}`}>
            <TrendIcon size={14} />
            <span className="text-[12px] font-bold">
              {recap.commandsTrend > 0 ? '+' : ''}{recap.commandsTrend}%
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4">
          <StatPill icon={Terminal} label={t('week_unique', 'Unique')} value={recap.uniqueCommandsUsed} />
          <StatPill icon={Star} label={t('week_favorites', 'Favorites')} value={recap.favoritesAdded} />
          <StatPill icon={Trophy} label={t('week_achievements', 'Achievements')} value={recap.achievementsUnlocked} />
        </div>

        {/* Top commands */}
        {recap.topCommands.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {recap.topCommands.map((tc) => (
              <span
                key={tc.command}
                className="px-2.5 py-1 rounded-full bg-tg-accent/10 text-[11px] font-medium text-tg-accent"
              >
                /{tc.command} × {tc.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: typeof Terminal; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-tg-hint/60" />
      <span className="text-[12px] font-semibold text-tg-text">{value}</span>
      <span className="text-[11px] text-tg-hint">{label}</span>
    </div>
  );
}
