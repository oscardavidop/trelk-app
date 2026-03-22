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
      <div className="bg-tg-secondary border border-tg-border/40 rounded-[20px] p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-[38px] h-[38px] rounded-[12px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2.5 shadow-sm">
          <Star size={18} className="text-amber-500 fill-amber-500/30" />
        </div>
        <div className="text-[18px] font-bold text-tg-text leading-none mb-1">
          {stats.rating.toFixed(1)}
        </div>
        <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">
          {t('rating', 'Rating')}
        </div>
      </div>

      {/* ── Tarjeta: Semanal ── */}
      <div className="bg-tg-secondary border border-tg-border/40 rounded-[20px] p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-[38px] h-[38px] rounded-[12px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-2.5 shadow-sm">
          <Flame size={18} className="text-orange-500 fill-orange-500/30" />
        </div>
        <div className="text-[18px] font-bold text-tg-text leading-none mb-1">
          {stats.weeklyUses >= 1000 ? `${(stats.weeklyUses / 1000).toFixed(1)}k` : stats.weeklyUses}
        </div>
        <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">
          {t('weekly', 'Weekly')}
        </div>
      </div>

      {/* ── Tarjeta: Favoritos ── */}
      <div className="bg-tg-secondary border border-tg-border/40 rounded-[20px] p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-[38px] h-[38px] rounded-[12px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-2.5 shadow-sm">
          <Heart size={18} className="text-pink-500 fill-pink-500/30" />
        </div>
        <div className="text-[18px] font-bold text-tg-text leading-none mb-1">
          {stats.favorites >= 1000 ? `${(stats.favorites / 1000).toFixed(1)}k` : stats.favorites}
        </div>
        <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">
          {t('favorites_label', 'Favorites')}
        </div>
      </div>

    </div>
  );
}