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
  return <Icon className={className} size={20} />;
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
      className={`w-full relative rounded-[20px] border p-4 text-left transition-all duration-200 active:scale-[0.98] group overflow-hidden flex flex-col h-full shadow-sm ${
        a.unlocked 
          ? 'bg-amber-500/5 border-amber-500/30' 
          : 'bg-tg-secondary border-tg-border/40'
      }`}
    >
      {/* ── Brillo de fondo (Solo desbloqueados) ── */}
      {a.unlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative flex-1 flex flex-col w-full">
        
        {/* ── Cabecera: Icono y Estado ── */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shadow-sm border transition-transform duration-200 group-active:scale-95 ${
            a.unlocked ? 'bg-amber-500/10 border-amber-500/20' : 'bg-tg-hint/10 border-white/5'
          }`}>
            <AchievementIcon name={a.icon} className={a.unlocked ? 'text-amber-500 drop-shadow-sm' : 'text-tg-hint/50'} />
          </div>
          
          {a.unlocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              <CheckCircle2 size={12} strokeWidth={2.5} /> {t('done')}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-tg-hint font-mono bg-tg-hint/10 border border-tg-border/40 px-2 py-0.5 rounded-full tracking-wider">
              {a.progress}/{a.goal}
            </span>
          )}
        </div>

        {/* ── Información (Título y Descripción) ── */}
        <div className="flex-1">
          <h3 className={`text-[15px] font-semibold leading-tight ${a.unlocked ? 'text-tg-text' : 'text-tg-text/80'}`}>
            {a.name}
          </h3>
          <p className="text-[12px] font-medium text-tg-hint mt-1 leading-snug line-clamp-2">
            {a.description}
          </p>
        </div>

        {/* ── Pie de Tarjeta: Progreso y Recompensa ── */}
        <div className="mt-3.5">
          {/* Barra de Progreso */}
          {!a.unlocked && (
            <div className="mb-3 h-1.5 rounded-full bg-tg-hint/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tg-accent to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          )}

          {/* Recompensa */}
          <div className={`flex items-center gap-1.5 pt-2.5 border-t ${a.unlocked ? 'border-amber-500/20' : 'border-tg-border/40'}`}>
            <Gift size={14} className={a.unlocked ? 'text-amber-500' : 'text-tg-hint/60'} />
            <span className={`text-[11px] font-semibold tracking-wide truncate ${a.unlocked ? 'text-amber-500' : 'text-tg-hint/80'}`}>
              +{a.rewardXP} XP <span className="opacity-50 mx-0.5">•</span> {a.rewardLabel}
            </span>
          </div>
        </div>

      </div>
    </button>
  );
}