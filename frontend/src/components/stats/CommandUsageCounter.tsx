import { useEffect, useRef, useState } from 'react';
import { Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { useGlobalStats } from '../../hooks/useGlobalStats';

const fmt = new Intl.NumberFormat('es-CO'); // Asegura formato numérico consistente (ej. 1.234)

export default function CommandUsageCounter() {
  const { commandsToday, growthToday } = useGlobalStats();
  const [display, setDisplay] = useState(commandsToday);
  const prevRef = useRef(commandsToday);

  // Animación suave de incremento (Count-up)
  useEffect(() => {
    const from = prevRef.current;
    const to = commandsToday;
    if (from === to) return;

    const duration = 800; // 800ms para una animación un poco más premium
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cúbico (inicia rápido, termina lento)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      if (progress < 1) {
        setDisplay(Math.round(from + (to - from) * eased));
        requestAnimationFrame(tick);
      } else {
        setDisplay(to); // Aseguramos aterrizar en el número exacto
      }
    };

    requestAnimationFrame(tick);
    prevRef.current = to;
  }, [commandsToday]);

  const isPositive = growthToday >= 0;
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 flex items-center gap-4 shadow-sm relative overflow-hidden group animate-slide-up">
      
      {/* ── Resplandor ambiental de fondo ── */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full pointer-events-none transition-opacity duration-500 opacity-60 group-hover:opacity-100" />

      {/* ── Ícono Destacado ── */}
      <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgba(249,115,22,0.3)] border border-white/10 transition-transform duration-300 group-hover:scale-105 relative z-10">
        <Flame size={24} className="text-white fill-white/20 drop-shadow-sm" />
      </div>
      
      {/* ── Contenido ── */}
      <div className="flex-1 min-w-0 relative z-10 pt-0.5">
        
        <div className="flex items-center gap-2.5 mb-1.5">
          {/* Número (Tabular nums evita que el texto tiemble mientras se anima) */}
          <div className="text-[26px] font-black text-tg-text tracking-tight leading-none tabular-nums drop-shadow-sm">
            {fmt.format(display)}
          </div>
          
          {/* Badge de crecimiento (Verde/Rojo adaptativo) */}
          {growthToday !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-[8px] border shadow-sm ${
              isPositive 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              <GrowthIcon size={12} strokeWidth={3} />
              <span className="text-[11px] font-extrabold tracking-wider">
                {isPositive ? '+' : ''}{fmt.format(growthToday)}
              </span>
            </div>
          )}
        </div>
        
        {/* Subtítulo */}
        <div className="text-[11px] font-extrabold text-tg-hint uppercase tracking-widest">
          Comandos hoy
        </div>

      </div>
    </div>
  );
}