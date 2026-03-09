import { useState, useEffect } from 'react';
import { useGamificationStore } from '../stores/gamification';
import AchievementCard from '../components/achievements/AchievementCard';
import XPProgress from '../components/XPProgress';
import { useHideIsland } from '../hooks/useHideIsland';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

type Filter = 'all' | 'unlocked' | 'locked';

export default function AchievementsPage() {
  useHideIsland();
  const { achievements, loaded, loading, loadGamification } = useGamificationStore();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => { if (!loaded) loadGamification(); }, [loaded, loadGamification]);

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tg-hint" />
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
    { key: 'all', label: `Todos (${total})` },
    { key: 'unlocked', label: `Desbloqueados (${unlocked})` },
    { key: 'locked', label: `Pendientes (${total - unlocked})` },
  ];

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title="Logros" subtitle="Completa retos para ganar recompensas" 
      icon={<div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
        <Trophy className="w-6 h-6 text-amber-500" />
      </div>} />

      {/* ── XP Card ── */}
      <div className="px-5 mb-5 animate-slide-up mt-4">
        <XPProgress />
      </div>

      {/* ── Stats Strip (Bento Grid) ── */}
      <div className="px-5 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-tg-text leading-none">{unlocked}</div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Logrados</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-tg-text leading-none">{total - unlocked}</div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Faltan</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-amber-400 leading-none">{percentage}%</div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Progreso</div>
          </div>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="mb-4">
        <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 border ${filter === f.key
                  ? 'bg-tg-accent border-tg-accent text-white shadow-[0_4px_12px_rgba(var(--tg-accent-rgb),0.25)]'
                  : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-white/[0.02]'
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
          /* Estado Vacío */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4 shadow-sm">
              <Medal size={32} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-bold text-tg-text tracking-tight">No hay logros aquí</p>
            <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Sigue completando tareas para verlos aparecer.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}