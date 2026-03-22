import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram'; // Asegúrate de importar el hook para los haptics
import { useGamificationStore } from '../stores/gamification';
import AchievementCard from '../components/achievements/AchievementCard';
import XPProgress from '../components/XPProgress';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

type Filter = 'all' | 'unlocked' | 'locked';

export default function AchievementsPage() {
  const { t } = useTranslation('achievements');
  const { haptic } = useTelegram();
  const { achievements, loaded, loading, loadGamification } = useGamificationStore();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => { 
    if (!loaded) loadGamification(); 
  }, [loaded, loadGamification, achievements.length]);

  if (loading && !loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-tg-accent" />
        <span className="text-[13px] font-medium text-tg-hint animate-pulse">{t('common:loading', 'Loading...')}</span>
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('all', { count: total }) },
    { key: 'unlocked', label: t('unlocked', { count: unlocked }) },
    { key: 'locked', label: t('locked', { count: total - unlocked }) },
  ];

  const handleFilterChange = (newFilter: Filter) => {
    haptic?.impactOccurred('light');
    setFilter(newFilter);
  };

  return (
    <div className="pb-28 animate-fade-in relative">
      <StickyHeader 
        title={t('title')} 
        subtitle={t('subtitle')} 
        icon={
          <div className="w-[42px] h-[42px] rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
        } 
      />

      {/* ── XP Card ── */}
      <div className="px-5 mb-5 animate-slide-up mt-4">
        <XPProgress />
      </div>

      {/* ── Stats Strip (Bento Grid) ── */}
      <div className="px-5 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-bold text-tg-text leading-none mb-1">{unlocked}</div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('achieved')}</div>
          </div>
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-bold text-tg-text leading-none mb-1">{total - unlocked}</div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('remaining')}</div>
          </div>
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-bold text-amber-500 leading-none mb-1">{percentage}%</div>
            <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider">{t('progress')}</div>
          </div>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="mb-4">
        <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-95 border ${
                filter === f.key
                  ? 'bg-tg-accent border-tg-accent text-white shadow-md'
                  : 'bg-tg-secondary border-tg-border/40 text-tg-hint hover:bg-tg-hint/10 shadow-sm'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid de Logros ── */}
      <div className="px-5 mt-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        ) : (
          /* Estado Vacío Elegante */
          <div className="p-6 rounded-[24px] bg-tg-secondary border border-tg-border/40 text-center shadow-sm flex flex-col items-center justify-center mt-4">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-tg-hint/10 flex items-center justify-center mb-4 shadow-inner">
              <Medal size={28} className="text-tg-hint/40" />
            </div>
            <h3 className="text-[15px] font-semibold text-tg-text mb-1">{t('no_achievements')}</h3>
            <p className="text-[13px] text-tg-hint leading-relaxed max-w-[220px] mx-auto">
              {t('no_achievements_desc')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}