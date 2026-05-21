import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PlanTier,
  ProFeatures,
  RealSubStatus,
  RealSubscription,
  PayPalPlan,
} from '../../services/subscriptionApi';

import {
  Zap,
  Crown,
  Sparkles,
  Clock3,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  CalendarX2,
  ArrowUpRight,
  ArrowDownCircle,
} from 'lucide-react';

const TIER_META: Record<
  PlanTier,
  {
    label: string;
    color: string;
    soft: string;
    gradient: string;
    icon: React.ReactNode;
  }
> = {
  free: {
    label: 'Free',
    color: '#9ca3af',
    soft: 'rgba(156,163,175,0.12)',
    gradient:
      'radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 35%), linear-gradient(135deg, rgba(31,41,55,0.95), rgba(17,24,39,0.92))',
    icon: <Zap size={24} className="text-gray-300" />,
  },

  pro: {
    label: 'Pro',
    color: '#f59e0b',
    soft: 'rgba(245,158,11,0.14)',
    gradient:
      'radial-gradient(circle at top right, rgba(245,158,11,0.16), transparent 35%), linear-gradient(135deg, rgba(36,24,12,0.98), rgba(20,15,8,0.96))',
    icon: <Crown size={24} className="text-amber-400" />,
  },

  ultra: {
    label: 'Ultra',
    color: '#8b5cf6',
    soft: 'rgba(139,92,246,0.14)',
    gradient:
      'radial-gradient(circle at top right, rgba(139,92,246,0.18), transparent 35%), linear-gradient(135deg, rgba(26,18,44,0.98), rgba(15,12,28,0.96))',
    icon: <Sparkles size={24} className="text-violet-400" />,
  },
};

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
};

function getStatusConfig(realStatus?: RealSubStatus): StatusConfig {
  switch (realStatus) {
    case 'ACTIVE':
      return {
        label: 'Active',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.14)',
        Icon: CheckCircle2,
      };

    case 'ACTIVE_CANCEL_SCHEDULED':
      return {
        label: 'Ending Soon',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.14)',
        Icon: CalendarX2,
      };

    case 'SUSPENDED':
      return {
        label: 'Suspended',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.14)',
        Icon: PauseCircle,
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.14)',
        Icon: XCircle,
      };

    case 'PAST_DUE':
      return {
        label: 'Past Due',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.14)',
        Icon: AlertTriangle,
      };

    case 'PENDING':
      return {
        label: 'Activating',
        color: '#38bdf8',
        bg: 'rgba(56,189,248,0.14)',
        Icon: Clock3,
      };

    default:
      return {
        label: 'Free',
        color: '#9ca3af',
        bg: 'rgba(156,163,175,0.12)',
        Icon: Zap,
      };
  }
}

function timeUntil(
  isoDate: string | undefined,
  t: (key: string, opts?: any) => string
): string {
  if (!isoDate) {
    return t('subscription:no_expiry', 'Lifetime access');
  }

  const diff = new Date(isoDate).getTime() - Date.now();

  if (diff <= 0) {
    return t('subscription:expired', 'Expired');
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  if (days > 0) {
    return t('subscription:time_remaining_days', {
      days,
      hours,
      defaultValue: `${days}d ${hours}h left`,
    });
  }

  return t('subscription:time_remaining_hours', {
    hours,
    defaultValue: `${hours}h left`,
  });
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  features: ProFeatures;
  realStatus?: RealSubStatus;
  realSub?: RealSubscription | null;
  plans?: PayPalPlan[];
}

export default function SubscriptionHero({
  features,
  realStatus,
  realSub,
  plans = [],
}: Props) {
  const { t } = useTranslation('subscription');

  const { subscription, performance, support } = features;

  const tier = subscription.tier;
  const meta = TIER_META[tier];

  const statusCfg = getStatusConfig(realStatus);
  const StatusIcon = statusCfg.Icon;

  const billingDate =
    realSub?.next_billing_date ?? subscription.expires_at;

  const scheduledPlanMeta = realSub?.scheduled_plan_id
    ? plans.find((p) => p.plan_id === realSub.scheduled_plan_id)
    : null;

  // Use billing_preview.amount when available (reflects scheduled downgrade price accurately)
  const nextChargeAmount = realSub?.billing_preview
    ? realSub.billing_preview.amount
    : (realSub?.amount ?? subscription.price ?? null);
  const nextChargeCurrency = realSub?.billing_preview?.currency ?? realSub?.currency ?? 'USD';

  const price = subscription?.price
    ? `$${subscription.price.toFixed(2)}`
    : null;

  const statusText =
    realStatus === 'ACTIVE'
      ? t('next_billing', 'Next billing')
      : realStatus === 'ACTIVE_CANCEL_SCHEDULED'
      ? t('access_until', 'Access until')
      : t('expires', 'Expires');

  return (
    <div className="px-4 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className="relative overflow-hidden rounded-[32px] border backdrop-blur-2xl"
        style={{
          background: meta.gradient,
          borderColor: `${meta.color}30`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 20px 60px rgba(0,0,0,0.45)
          `,
        }}
      >
        {/* glow */}
        <div
          className="absolute -top-24 -right-24 w-[220px] h-[220px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{
            background: meta.color,
          }}
        />

        {/* mesh */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative z-10 p-5">
          {/* top */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              {/* icon */}
              <div
                className="relative shrink-0 w-[62px] h-[62px] rounded-[20px] flex items-center justify-center"
                style={{
                  background: meta.soft,
                  border: `1px solid ${meta.color}30`,
                  boxShadow: `0 10px 30px ${meta.color}22`,
                }}
              >
                <div
                  className="absolute inset-0 rounded-[20px]"
                  style={{
                    background:
                      'linear-gradient(to bottom right, rgba(255,255,255,0.08), transparent)',
                  }}
                />

                {meta.icon}
              </div>

              {/* title */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[28px] leading-none font-black tracking-tight text-white">
                    {meta.label}
                  </h2>

                  {tier !== 'free' && (
                    <div
                      className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{
                        background: meta.soft,
                        color: meta.color,
                        border: `1px solid ${meta.color}25`,
                      }}
                    >
                      Premium
                    </div>
                  )}
                </div>

                {price ? (
                  <div className="flex items-center gap-1.5 mt-2 text-sm">
                    <span className="text-white/85 font-semibold">
                      {price}
                      {t('per_month_short', 'mo')}
                    </span>

                    <span className="text-white/40">
                      {realSub?.currency ?? 'USD'}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-[13px] text-white/45 font-medium">
                    {t(
                      'free_plan_desc',
                      'No payment required'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* status */}
            <div
              className="shrink-0 flex items-center gap-2 rounded-full px-3 py-2"
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.color}25`,
                backdropFilter: 'blur(14px)',
              }}
            >
              <StatusIcon
                size={14}
                style={{
                  color: statusCfg.color,
                }}
              />

              <span
                className="text-[11px] font-black uppercase tracking-[0.16em]"
                style={{
                  color: statusCfg.color,
                }}
              >
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* scheduled downgrade banner */}
          {scheduledPlanMeta && realStatus === 'ACTIVE' && (
            <div
              className="mt-5 rounded-[22px] p-3.5"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.18)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <ArrowDownCircle size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-blue-400/70 mb-0.5">
                    {t('downgrade_scheduled_label', 'Scheduled Change')}
                  </div>
                  <div className="text-[13px] font-semibold text-white/80">
                    → {scheduledPlanMeta.displayName}
                    {scheduledPlanMeta.price > 0 && (
                      <span className="text-white/55"> · ${scheduledPlanMeta.price.toFixed(2)}/{t('per_month_short', 'mo')}</span>
                    )}
                    <span className="text-white/40"> · {formatDate(realSub?.next_billing_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* billing card */}
          {(billingDate || tier === 'free') && (
            <div
              className={`${scheduledPlanMeta ? 'mt-3' : 'mt-5'} rounded-[22px] p-4`}
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <CalendarDays
                    size={18}
                    className="text-white/65"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/40 mb-1">
                    {billingDate
                      ? statusText
                      : t('no_expiry', 'No expiry')}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[17px] font-bold text-white">
                      {billingDate
                        ? formatDate(billingDate)
                        : 'Unlimited'}
                    </span>

                    {billingDate && (
                      <div className="flex items-center gap-1 text-[12px] text-white/45 font-medium">
                        <ArrowUpRight size={12} />
                        {timeUntil(billingDate, t)}
                      </div>
                    )}
                  </div>

                  {/* Next charge amount — uses billing_preview for accuracy when downgrade is pending */}
                  {realStatus === 'ACTIVE' && nextChargeAmount != null && nextChargeAmount > 0 && (
                    <div className="mt-1.5 text-[12px] font-semibold text-white/50">
                      {nextChargeCurrency} {nextChargeAmount.toFixed(2)}
                      {scheduledPlanMeta && (
                        <span className="ml-1 text-blue-400">
                          · {scheduledPlanMeta.displayName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
}

export { TIER_META, timeUntil };