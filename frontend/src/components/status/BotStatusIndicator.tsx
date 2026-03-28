import { Circle, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBotStatus } from '../../hooks/useBotStatus';
import { useState } from 'react';

const STATUS_CONFIG = {
  online: {
    icon: Circle,
    color: 'text-emerald-400',
    pulse: 'bg-emerald-400',
    key: 'status_online',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    pulse: 'bg-amber-400',
    key: 'status_degraded',
  },
  down: {
    icon: XCircle,
    color: 'text-red-400',
    pulse: 'bg-red-400',
    key: 'status_down',
  },
} as const;

export default function BotStatusIndicator() {
  const { status, latencyMs, errorRate, isLoading } = useBotStatus();
  const { t } = useTranslation('ui');
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip((p) => !p)}
        onBlur={() => setShowTooltip(false)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all active:scale-95"
        aria-label={t(config.key)}
      >
        <span className="relative flex h-2.5 w-2.5">
          {status !== 'online' && (
            <span className={`absolute inset-0 rounded-full ${config.pulse} animate-ping opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.pulse}`} />
        </span>
        {status !== 'online' && (
          <Icon size={14} className={config.color} />
        )}
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 p-3 bg-black/90 backdrop-blur-xl rounded-[14px] border border-white/10 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} className={config.color} />
            <span className="text-[13px] font-semibold text-white">{t(config.key)}</span>
          </div>
          <div className="space-y-1 text-[11px] text-white/60">
            <p>{t('status_latency')}: <span className="text-white/90">{latencyMs}ms</span></p>
            <p>{t('status_error_rate')}: <span className="text-white/90">{(errorRate * 100).toFixed(1)}%</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
