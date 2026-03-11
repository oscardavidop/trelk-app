import { useTranslation } from 'react-i18next';
import type { Achievement } from '../../stores/gamification';
import { Gift, CheckCircle2, Trophy, Star, Rocket, Flame, Gem, Sparkles, Globe, Moon, Bot, Zap, Music, Headphones, CalendarCheck, CalendarRange, Languages } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  trophy: Trophy, star: Star, rocket: Rocket, flame: Flame, gem: Gem,
  sparkles: Sparkles, globe: Globe, moon: Moon, bot: Bot, zap: Zap,
  music: Music, headphones: Headphones, 'calendar-check': CalendarCheck,
  'calendar-range': CalendarRange, languages: Languages,
};

function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Trophy;
  return <Icon className={className} size={22} />;
}

interface AchievementCardProps {
  achievement: Achievement;
  onTap?: () => void;
}

export default function AchievementCard({ achievement: a, onTap }: AchievementCardProps) {
  const { t } = useTranslation('achievements');
  const pct = a.goal > 0 ? Math.min(a.progress / a.goal, 1) : 0;

  return (
    <button
      onClick={onTap}
      className={`w-full relative bg-tg-secondary rounded-[20px] border p-4 text-left transition-all duration-300 active:scale-[0.95] group overflow-hidden flex flex-col h-full ${
        a.unlocked 
          ? 'border-amber-400/30 shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:bg-white/[0.03]' 
          : 'border-tg-border/50 shadow-sm opacity-90 hover:opacity-100 hover:bg-white/[0.02]'
      }`}
    >
      {/* ── Brillo de fondo (Solo desbloqueados) ── */}
      {a.unlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative flex-1 flex flex-col w-full">
        
        {/* ── Cabecera: Icono y Estado ── */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 ${
            a.unlocked ? 'bg-amber-400/20' : 'bg-black/20'
          }`}>
            <AchievementIcon name={a.icon} className={a.unlocked ? 'text-amber-400 drop-shadow-md' : 'text-tg-hint/40'} />
          </div>
          
          {a.unlocked ? (
            <span className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              <CheckCircle2 size={10} strokeWidth={3} /> {t('done')}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-tg-hint font-mono bg-black/20 border border-white/5 px-2 py-0.5 rounded-full tracking-wider">
              {a.progress}/{a.goal}
            </span>
          )}
        </div>

        {/* ── Información (Título y Descripción) ── */}
        <div className="flex-1">
          <h3 className={`text-[14px] font-bold  leading-tight ${a.unlocked ? 'text-tg-text' : 'text-tg-text/80'}`}>
            {a.name}
          </h3>
          <p className="text-[11px] font-medium text-tg-hint mt-1.5 leading-snug line-clamp-2">
            {a.description}
          </p>
        </div>

        {/* ── Pie de Tarjeta: Progreso y Recompensa ── */}
        <div className="mt-3">
          {/* Barra de Progreso */}
          {!a.unlocked && (
            <div className="mb-2.5 h-1.5 rounded-full bg-black/20 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tg-accent to-blue-400 transition-all duration-500 ease-out relative"
                style={{ width: `${pct * 100}%` }}
              >
                {/* Brillo sutil dentro de la barra */}
                <div className="absolute inset-0 bg-white/20" />
              </div>
            </div>
          )}

          {/* Recompensa */}
          <div className={`flex items-center gap-1.5 pt-2.5 border-t ${a.unlocked ? 'border-amber-400/15' : 'border-white/5'}`}>
            <Gift size={12} className={a.unlocked ? 'text-amber-400' : 'text-tg-hint/60'} />
            <span className={`text-[10px] font-bold tracking-wide truncate ${a.unlocked ? 'text-amber-400' : 'text-tg-hint'}`}>
              +{a.rewardXP} XP <span className="opacity-50 mx-0.5">•</span> {a.rewardLabel}
            </span>
          </div>
        </div>

      </div>
    </button>
  );
}