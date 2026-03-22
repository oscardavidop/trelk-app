import { useTranslation } from 'react-i18next';
import { useGamificationStore } from '../stores/gamification';
import { Flame } from 'lucide-react';

interface XPProgressProps {
  compact?: boolean;
  rounded?: boolean;
}

export default function XPProgress({ compact, rounded }: XPProgressProps) {
  const { t } = useTranslation('achievements');
  const { xp, streak, level, currentLevelXP: currentXP, nextLevelXP: nextXP, levelProgress: progress } = useGamificationStore();
  const xpToNextLevel = nextXP - currentXP;

  // ── MODO COMPACTO (Para cabeceras o listas) ──
  if (compact) {
    return (
      <div className="flex items-center gap-3.5 group cursor-default">

        {/* ── Izquierda: Insignia de Nivel ── */}
        <div className="relative shrink-0">
          {/* Contenedor principal con efecto de borde luminoso y sombra */}
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-amber-400 to-orange-500 p-[1px] shadow-[0_2px_10px_rgba(245,158,11,0.25)] transition-transform duration-300 group-hover:scale-105">
            {/* Textura interior estilo cristal */}
            <div className="w-full h-full rounded-[11px] bg-gradient-to-b from-white/20 to-transparent flex items-center justify-center shadow-inner">
              <span className="text-[15px] font-black text-white drop-shadow-md">{level}</span>
            </div>
          </div>

          {/* Mini-fuego de racha (consistente con el resto del diseño) */}
          {streak > 1 && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-tg-bg border border-tg-border/40 flex items-center justify-center shadow-md z-10">
              <Flame size={10} className="text-orange-500 fill-orange-500 drop-shadow-sm" />
            </div>
          )}
        </div>

        {/* ── Derecha: Textos y Barra ── */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-end justify-between mb-1.5 px-0.5">
            <span className="text-[13px] font-bold text-tg-text tracking-tight leading-none">
              {t('level', { level, defaultValue: `Level ${level}` })}
            </span>
            {/* Contraste tipográfico para resaltar el XP actual sobre el total */}
            <span className="text-[10px] font-bold text-tg-hint uppercase leading-none tracking-wide">
              <span className="text-tg-text font-black">{currentXP}</span> / {nextXP} XP
            </span>
          </div>

          {/* Fondo de barra adaptativo al tema */}
          <div className="h-1.5 rounded-full bg-tg-hint/20 shadow-inner overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out relative"
              style={{ width: `${progress * 100}%` }}
            >
              {/* Brillo superior fino (tubo de luz) */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ── MODO ROUNDED (Píldora Premium 80x52px) ──
  if (rounded) {
    return (
      <div className="w-auto max-w-[130px] h-[58px] rounded-full bg-tg-bg/60 backdrop-blur-xl border border-tg-border/40 flex items-center p-1 shadow-sm relative overflow-hidden cursor-default">

        {/* Brillo superior (Efecto cristal) */}
        <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-full" />

        {/* ── Izquierda: Esfera del Nivel ── */}
        <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-[1.5px] shrink-0 relative z-10 shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
          {/* Textura interna de la esfera */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-white/20 to-transparent flex items-center justify-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 border border-white/30 rounded-full" />
            <span className="text-[16px] font-black text-white drop-shadow-md leading-none tracking-tight mt-0.5 relative z-10">
              {level}
            </span>
          </div>

          {/* Detalle: Mini Fuego superpuesto si hay racha */}
          {streak > 1 && (
            <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-tg-bg border border-tg-border/40 flex items-center justify-center shadow-sm z-20">
              <Flame size={10} className="text-orange-500 fill-orange-500" />
            </div>
          )}
        </div>

        {/* ── Derecha: Textos y Barra ── */}
        <div className="flex-1 flex flex-col justify-center px-2.5 z-10 min-w-0">

          {/* Fila superior: XP a la izquierda, Porcentaje a la derecha */}
          <div className="flex items-end justify-between w-full mb-1.5">
            <span className="text-[11px] font-extrabold text-tg-text leading-none tracking-tight">
              {currentXP}/{nextXP} <span className="text-[8px] text-tg-hint font-bold uppercase ml-px">XP</span>
            </span>
            <span className="text-[10px] font-black text-amber-500 leading-none">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* Mini barra tipo neón */}
          <div className="w-full h-1.5 rounded-full bg-tg-hint/20 shadow-inner overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 relative"
              style={{ width: `${progress * 100}%` }}
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ── MODO NORMAL (Para la página principal de Logros) ──
  return (
    <div className="relative bg-tg-secondary rounded-[24px] border border-tg-border/40 p-5 shadow-sm group">

      {/* Resplandor ambiental de fondo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-75" />

      <div className="flex items-center gap-4 relative z-10">

        {/* Insignia de Nivel Principal */}
        <div className="relative">
          <div className="w-[64px] h-[64px] rounded-[18px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_4px_15px_rgba(245,158,11,0.25)] border border-white/20 transition-transform group-hover:scale-105 duration-300">
            <span className="text-[24px] font-black text-white drop-shadow-md">{level}</span>
          </div>

          {/* Indicador de Racha (Streak) */}
          {streak > 1 && (
            <div className="absolute -top-2.5 -right-2.5 w-[28px] h-[28px] rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center ring-[3px] ring-tg-secondary shadow-sm animate-bounce-subtle">
              <Flame size={14} className="text-white fill-white/80 drop-shadow-sm" />
            </div>
          )}
        </div>

        {/* Textos y Barra */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-baseline gap-2.5 mb-2.5">
            <span className="text-[18px] font-extrabold text-tg-text leading-none">{t('level', { level, defaultValue: `Level ${level}` })}</span>
            <span className="text-[12px] font-bold text-tg-hint leading-none">{xp} XP {t('total', 'Total')}</span>
          </div>

          {/* Barra de progreso ancha */}
          <div className="h-2.5 rounded-full bg-tg-hint/20 shadow-inner overflow-hidden mb-2.5">
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
            <span className="text-[11px] font-medium text-tg-hint truncate pr-2">
              {t('xp_remaining', { xp: xpToNextLevel, defaultValue: `${xpToNextLevel} XP left` })}
            </span>

            {streak > 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                <Flame size={12} className="fill-orange-500/50" /> {t('streak_days', { count: streak, defaultValue: `${streak} Day Streak` })}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}