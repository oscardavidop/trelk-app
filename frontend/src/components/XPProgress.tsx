import { useTranslation } from 'react-i18next';
import { useGamificationStore } from '../stores/gamification';
import { Flame } from 'lucide-react';

interface XPProgressProps {
  compact?: boolean;
}

export default function XPProgress({ compact }: XPProgressProps) {
  const { t } = useTranslation('achievements');
  const { xp, streak, level, currentLevelXP: currentXP, nextLevelXP: nextXP, levelProgress: progress } = useGamificationStore();

  // ── MODO COMPACTO (Para cabeceras o listas) ──
  if (compact) {
    return (
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner border border-white/10">
          <span className="text-[14px] font-black text-white drop-shadow-sm">{level}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-bold text-tg-text ">{t('level', { level })}</span>
            <span className="text-[10px] font-extrabold text-tg-hint uppercase ">{currentXP} / {nextXP} XP</span>
          </div>
          
          <div className="h-1.5 rounded-full bg-black/20 border border-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out relative"
              style={{ width: `${progress * 100}%` }}
            >
              {/* Brillo 3D interno */}
              <div className="absolute inset-0 bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODO NORMAL (Para la página principal de Logros) ──
  return (
    <div className="relative bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 shadow-sm overflow-hidden group">
      
      {/* Resplandor ambiental de fondo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none transition-opacity group-hover:opacity-75" />

      <div className="flex items-center gap-4 relative z-10">
        
        {/* Insignia de Nivel Principal */}
        <div className="relative">
          <div className="w-16 h-16 rounded-[16px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_4px_15px_rgba(245,158,11,0.3)] border border-white/10 transition-transform group-hover:scale-105 duration-300">
            <span className="text-[24px] font-black text-white drop-shadow-md">{level}</span>
          </div>
          
          {/* Indicador de Racha (Streak) */}
          {streak > 1 && (
            <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center ring-[3px] ring-tg-secondary shadow-md animate-bounce-subtle">
              <Flame size={14} className="text-white fill-white/80" />
            </div>
          )}
        </div>

        {/* Textos y Barra */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-baseline gap-2.5 mb-2">
            <span className="text-[18px] font-extrabold text-tg-text ">{t('level', { level })}</span>
            <span className="text-[12px] font-bold text-tg-hint">{xp} XP {t('total')}</span>
          </div>
          
          {/* Barra de progreso ancha */}
          <div className="h-2.5 rounded-full bg-black/20 border border-white/5 overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-out relative"
              style={{ width: `${progress * 100}%` }}
            >
              {/* Efecto de cristal / tubo de luz en la barra */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/40" />
            </div>
          </div>
          
          {/* Pie del bloque */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-tg-hint">
              {t('xp_remaining', { xp: nextXP - currentXP })}
            </span>
            
            {streak > 1 && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase  text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full shadow-sm">
                <Flame size={10} className="fill-orange-400/50" /> {t('streak_days', { count: streak })}
              </span>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}