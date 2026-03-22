import { useTranslation } from 'react-i18next';
import type { PlanTier } from '../../services/subscriptionApi';
import type { ProFeatures } from '../../services/subscriptionApi';
import { Zap, Crown, Sparkles, Clock } from 'lucide-react';

const TIER_META: Record<PlanTier, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  free: {
    label: 'Free', color: '#9ca3af', gradient: 'from-gray-500/10 to-gray-800/5',
    icon: <Zap size={24} className="text-gray-400 drop-shadow-sm" />,
  },
  pro: {
    label: 'Pro', color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-600/5',
    icon: <Crown size={24} className="text-amber-500 drop-shadow-md" />,
  },
  ultra: {
    label: 'Ultra', color: '#8b5cf6', gradient: 'from-violet-500/20 to-fuchsia-600/5',
    icon: <Sparkles size={24} className="text-violet-500 drop-shadow-md" />,
  },
};

function timeUntil(isoDate: string | undefined, t: (key: string, opts?: any) => string): string {
  if (!isoDate) return t('subscription:no_expiry', 'Lifetime access');
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return t('subscription:expired', 'Expired');
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return t('subscription:time_remaining_days', { days, hours, defaultValue: `${days}d ${hours}h left` });
  return t('subscription:time_remaining_hours', { hours, defaultValue: `${hours}h left` });
}

interface Props {
  features: ProFeatures;
}

export default function SubscriptionHero({ features }: Props) {
  const { t } = useTranslation('subscription');
  const { subscription, performance, support } = features;
  const tier = subscription.tier;
  const meta = TIER_META[tier];

  return (
    <div className="px-5 mt-2 animate-scale-in">
      <div className={`relative rounded-[24px] overflow-hidden bg-gradient-to-br ${meta.gradient} p-5 border border-white/5 shadow-sm`}>
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-[200px] h-[200px] rounded-full blur-[50px] opacity-30 pointer-events-none"
          style={{ background: meta.color }}
        />

        <div className="relative z-10">
          {/* Plan info */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center shadow-sm"
              style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
            >
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[22px] font-bold text-tg-text leading-tight tracking-tight">
                {t('plan_label', { plan: meta.label, defaultValue: meta.label })}
              </div>
              <div className="text-[13px] font-medium text-tg-hint flex items-center gap-1.5 mt-0.5">
                <Clock size={14} className="opacity-70" />
                {tier === 'free' ? t('no_expiry', 'Never expires') : timeUntil(subscription.expires_at, t)}
              </div>
            </div>
          </div>

          {/* Quick stats (Bento Grid Mini) */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: t('priority', 'Priority'), value: performance.queue_priority },
              { label: t('speed', 'Speed'), value: `${performance.response_speed_multiplier}x` },
              { label: t('support', 'Support'), value: support.priority },
            ].map((s) => (
              <div key={s.label} className="backdrop-blur-md rounded-[16px] py-3 px-2 text-center shadow-sm">
                <div className="text-[11px] font-bold text-tg-hint uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-[14px] font-semibold text-tg-text capitalize leading-none truncate px-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TIER_META, timeUntil };