import { Star, Flame, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommandStatsData } from '../../services/commandStatsApi';

interface Props {
  stats: CommandStatsData;
}

export default function CommandStats({ stats }: Props) {
  const { t } = useTranslation('commandDetail');
  return (
    <div className="grid grid-cols-3 gap-3 px-5 animate-slide-up">
      
      {/* ── Tarjeta: Rating ── */}
      <div className="bg-tg-secondary border border-tg-border/50 rounded-[20px] p-4 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-9 h-9 rounded-[12px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-2.5 shadow-inner">
          <Star size={16} className="text-yellow-500 fill-yellow-500/30" />
        </div>
        <div className="text-[20px] font-black text-tg-text leading-none mb-1.5 ">
          {stats.rating.toFixed(1)}
        </div>
        <div className="text-[10px] font-extrabold text-tg-hint uppercase ">
          {t('rating')}
        </div>
      </div>

      {/* ── Tarjeta: Semanal ── */}
      <div className="bg-tg-secondary border border-tg-border/50 rounded-[20px] p-4 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-9 h-9 rounded-[12px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-2.5 shadow-inner">
          <Flame size={16} className="text-orange-500 fill-orange-500/30" />
        </div>
        <div className="text-[20px] font-black text-tg-text leading-none mb-1.5 ">
          {stats.weeklyUses >= 1000 ? `${(stats.weeklyUses / 1000).toFixed(1)}k` : stats.weeklyUses}
        </div>
        <div className="text-[10px] font-extrabold text-tg-hint uppercase ">
          {t('weekly')}
        </div>
      </div>

      {/* ── Tarjeta: Favoritos ── */}
      <div className="bg-tg-secondary border border-tg-border/50 rounded-[20px] p-4 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-9 h-9 rounded-[12px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-2.5 shadow-inner">
          <Heart size={16} className="text-pink-500 fill-pink-500/30" />
        </div>
        <div className="text-[20px] font-black text-tg-text leading-none mb-1.5 ">
          {stats.favorites >= 1000 ? `${(stats.favorites / 1000).toFixed(1)}k` : stats.favorites}
        </div>
        <div className="text-[10px] font-extrabold text-tg-hint uppercase ">
          {t('favorites_label')}
        </div>
      </div>

    </div>
  );
}