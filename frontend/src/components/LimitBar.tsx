import type { LimitCounter } from '../services/subscriptionApi';

interface LimitBarProps {
  label: string;
  icon: string | React.ReactNode;
  counter: LimitCounter;
  suffix?: string;
}

// ── Colores y brillos refinados ──────────────────────
function getBarColor(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500'; // Agotado
  if (ratio >= 0.8) return 'bg-orange-500'; // Casi al límite
  if (ratio >= 0.6) return 'bg-yellow-400'; // Precaución
  return 'bg-tg-accent'; // Normal
}

function getBarGlow(ratio: number): string {
  if (ratio >= 1) return 'shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  if (ratio >= 0.8) return 'shadow-[0_0_10px_rgba(249,115,22,0.4)]';
  if (ratio >= 0.6) return 'shadow-[0_0_10px_rgba(250,204,21,0.3)]';
  return ''; // Sin glow extra si el uso es bajo para mantenerlo limpio
}

export default function LimitBar({ label, icon, counter, suffix }: LimitBarProps) {
  const { total, used } = counter;
  const ratio = total > 0 ? used / total : 0;
  const pct = Math.min(ratio * 100, 100);
  const remaining = Math.max(total - used, 0);
  
  const isNearLimit = ratio >= 0.8 && ratio < 1;
  const isExhausted = ratio >= 1;

  return (
    <div className="py-3.5 px-4 hover:bg-white/[0.01] transition-colors">
      <div className="flex items-center justify-between mb-3">
        
        {/* Lado izquierdo: Icono y Textos */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 border border-white/[0.02]">
            {typeof icon === 'string' ? (
              <span className="text-[17px]">{icon}</span>
            ) : (
              icon
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-medium text-tg-text truncate leading-tight">
              {label}
            </div>
            <div className="text-[12px] text-tg-hint mt-0.5">
              {remaining > 0 ? `${remaining} restante${remaining !== 1 ? 's' : ''}` : 'Sin límite disponible'}
            </div>
          </div>
        </div>

        {/* Lado derecho: Contadores y Badges */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase ">
                Cerca
              </span>
            )}
            {isExhausted && (
              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase ">
                Agotado
              </span>
            )}
            <span className="text-[15px] font-medium text-tg-text tabular-nums">
              {used}
              <span className="text-tg-hint/60 text-[13px]">
                /{total}{suffix ? ` ${suffix}` : ''}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="h-[6px] bg-black/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(ratio)} ${getBarGlow(ratio)} relative`}
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer/Brillo interno sutil si la barra no está llena */}
          {ratio < 1 && ratio > 0 && (
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/20" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Static Limit ─────────────────────────────────
interface StaticLimitProps {
  label: string;
  icon: string | React.ReactNode;
  value: number | string;
  suffix?: string;
}

export function StaticLimit({ label, icon, value, suffix }: StaticLimitProps) {
  return (
    <div className="py-3.5 px-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 border border-white/[0.02]">
          {typeof icon === 'string' ? (
            <span className="text-[17px]">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <span className="text-[15px] font-medium text-tg-text">{label}</span>
      </div>
      
      {/* Contenedor estilo "Chip" para el valor estático */}
      <div className="flex items-baseline bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.02]">
        <span className="text-[15px] text-tg-text font-semibold tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className="text-tg-hint text-[13px] ml-1 font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}