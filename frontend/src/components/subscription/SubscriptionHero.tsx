import { useTranslation } from 'react-i18next';
import type { PlanTier } from '../../services/subscriptionApi';
import type { ProFeatures, RealSubStatus, RealSubscription } from '../../services/subscriptionApi';
import { Zap, Crown, Sparkles, Clock, CalendarDays, DollarSign, CheckCircle2, PauseCircle, XCircle, AlertTriangle } from 'lucide-react';

const TIER_META: Record<PlanTier, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  free: {
    label: 'Free', color: '#9ca3af', gradient: 'from-gray-500/10 to-gray-800/5',
    icon: <Zap size={26} className="text-gray-400 drop-shadow-sm" />,
  },
  pro: {
    label: 'Pro', color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-600/5',
    icon: <Crown size={26} className="text-amber-500 drop-shadow-md" />,
  },
  ultra: {
    label: 'Ultra', color: '#8b5cf6', gradient: 'from-violet-500/20 to-fuchsia-600/5',
    icon: <Sparkles size={26} className="text-violet-500 drop-shadow-md" />,
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

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type StatusConfig = { label: string; color: string; bg: string; Icon: React.ElementType };

function getStatusConfig(realStatus?: RealSubStatus): StatusConfig {
  switch (realStatus) {
    case 'ACTIVE':
      return { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircle2 };
    case 'SUSPENDED':
      return { label: 'Suspended', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: PauseCircle };
    case 'CANCELLED':
      return { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: XCircle };
    case 'PAST_DUE':
      return { label: 'Past Due', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: AlertTriangle };
    case 'PENDING':
      return { label: 'Activating', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', Icon: Clock };
    default:
      return { label: 'Free', color: '#9ca3af', bg: 'rgba(156,163,175,0.10)', Icon: Zap };
  }
}

interface Props {
  features: ProFeatures;
  realStatus?: RealSubStatus;
  realSub?: RealSubscription | null;
}

export default function SubscriptionHero({ features, realStatus, realSub }: Props) {
  const { t } = useTranslation('subscription');
  const { subscription, performance, support } = features;
  const tier = subscription.tier;
  const meta = TIER_META[tier];
  const statusCfg = getStatusConfig(realStatus);
  const StatusIcon = statusCfg.Icon;

  const billingDate = realSub?.next_billing_date ?? subscription.expires_at;
  const price = realSub?.amount ? `$${realSub.amount}` : null;

  return (
    <div className="px-5 mt-1 animate-scale-in">
      <div
        className={`relative rounded-[26px] overflow-hidden bg-gradient-to-br ${meta.gradient} p-5`}
        style={{ border: `1.5px solid ${meta.color}20` }}
      >
        {/* Background glow */}
        <div
          className="absolute -top-16 -right-16 w-[180px] h-[180px] rounded-full pointer-events-none"
          style={{ background: meta.color, filter: 'blur(50px)', opacity: 0.22 }}
        />

        <div className="relative z-10">
          {/* Top row: plan name + status pill */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              {/* Plan icon */}
              <div
                className="w-[54px] h-[54px] rounded-[17px] flex items-center justify-center shadow-sm"
                style={{ background: `${meta.color}15`, border: `1.5px solid ${meta.color}30` }}
              >
                {meta.icon}
              </div>
              <div>
                <div className="text-[23px] font-bold text-tg-text leading-tight tracking-tight">
                  {meta.label}
                </div>
                {price && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <DollarSign size={12} className="text-tg-hint opacity-70" />
                    <span className="text-[13px] font-semibold text-tg-hint">
                      {realSub?.amount}/{t('per_month_short', 'mo')} · {realSub?.currency ?? 'USD'}
                    </span>
                  </div>
                )}
                {tier === 'free' && (
                  <div className="text-[13px] font-medium text-tg-hint mt-0.5">
                    {t('free_plan_desc', 'No payment required')}
                  </div>
                )}
              </div>
            </div>

            {/* Status pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shrink-0"
              style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}25` }}
            >
              <StatusIcon size={12} style={{ color: statusCfg.color }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Billing / expiry row */}
          {billingDate ? (
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-[13px]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <CalendarDays size={14} className="text-tg-hint opacity-70 shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[12px] font-medium text-tg-hint">
                  {realStatus === 'ACTIVE' ? t('next_billing', 'Next billing:') : t('expires', 'Expires:')}
                </span>
                <span className="text-[13px] font-bold text-tg-text">{formatDate(billingDate)}</span>
                <span className="text-[11px] text-tg-hint opacity-60">· {timeUntil(billingDate, t)}</span>
              </div>
            </div>
          ) : tier === 'free' ? (
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-[13px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Clock size={14} className="text-tg-hint opacity-60 shrink-0" />
              <span className="text-[12px] font-medium text-tg-hint">{t('no_expiry', 'No expiry date')}</span>
            </div>
          ) : null}

          {/* Quick stats bento */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('priority', 'Priority'), value: performance.queue_priority },
              { label: t('speed', 'Speed'), value: `${performance.response_speed_multiplier}x` },
              { label: t('support', 'Support'), value: support.priority },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[14px] py-2.5 px-2 text-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="text-[10px] font-bold text-tg-hint uppercase tracking-wider mb-1 opacity-70">{s.label}</div>
                <div className="text-[13px] font-semibold text-tg-text capitalize leading-none truncate px-1">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TIER_META, timeUntil };