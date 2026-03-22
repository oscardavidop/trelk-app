import { useTranslation } from 'react-i18next';
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
  if (ratio >= 0.6) return 'bg-amber-400'; // Precaución
  return 'bg-tg-accent'; // Normal
}

function getBarGlow(ratio: number): string {
  if (ratio >= 1) return 'shadow-[0_0_12px_rgba(239,68,68,0.4)]';
  if (ratio >= 0.8) return 'shadow-[0_0_12px_rgba(249,115,22,0.4)]';
  if (ratio >= 0.6) return 'shadow-[0_0_12px_rgba(251,191,36,0.3)]';
  return 'shadow-[0_0_8px_var(--tg-accent-20)]'; // Glow sutil adaptativo para estado normal
}

export default function LimitBar({ label, icon, counter, suffix }: LimitBarProps) {
  const { t } = useTranslation('subscription');
  const { total, used } = counter;
  const ratio = total > 0 ? used / total : 0;
  const pct = Math.min(ratio * 100, 100);
  const remaining = Math.max(total - used, 0);
  
  const isNearLimit = ratio >= 0.8 && ratio < 1;
  const isExhausted = ratio >= 1;

  return (
    <div className="py-3.5 px-4 active:bg-tg-hint/5 transition-colors">
      <div className="flex items-center justify-between mb-3.5">
        
        {/* Lado izquierdo: Icono y Textos */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-hint/10 flex items-center justify-center flex-shrink-0 shadow-sm">
            {typeof icon === 'string' ? (
              <span className="text-[17px]">{icon}</span>
            ) : (
              icon
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-tg-text truncate leading-tight">
              {label}
            </div>
            <div className="text-[12px] font-medium text-tg-hint mt-0.5">
              {remaining > 0 ? t('remaining', { count: remaining, defaultValue: `${remaining} left` }) : t('no_limit', 'Unlimited')}
            </div>
          </div>
        </div>

        {/* Lado derecho: Contadores y Badges */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span className="text-[9px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('near', 'Low')}
              </span>
            )}
            {isExhausted && (
              <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('exhausted', 'Limit')}
              </span>
            )}
            <span className="text-[15px] font-bold text-tg-text tabular-nums">
              {used}
              <span className="text-tg-hint/70 text-[13px] font-semibold">
                /{total}{suffix ? ` ${suffix}` : ''}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="h-[6px] bg-tg-hint/20 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(ratio)} ${getBarGlow(ratio)} relative`}
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer/Brillo interno sutil si la barra no está llena */}
          {ratio < 1 && ratio > 0 && (
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 rounded-full" />
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
    <div className="py-3.5 px-4 flex items-center justify-between active:bg-tg-hint/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-hint/10 flex items-center justify-center flex-shrink-0 shadow-sm">
          {typeof icon === 'string' ? (
            <span className="text-[17px]">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <span className="text-[15px] font-semibold text-tg-text">{label}</span>
      </div>
      
      {/* Contenedor estilo "Chip" para el valor estático */}
      <div className="flex items-baseline bg-tg-hint/10 px-3 py-1.5 rounded-[10px] border border-tg-border/20 shadow-sm">
        <span className="text-[15px] text-tg-text font-bold tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className="text-tg-hint text-[12px] ml-1 font-semibold">{suffix}</span>
        )}
      </div>
    </div>
  );
}