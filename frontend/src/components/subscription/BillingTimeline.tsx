import { useTranslation } from 'react-i18next';
import { ArrowDown, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { TIER_META } from './SubscriptionHero';
import type { RealSubStatus, RealSubscription, PayPalPlan, PlanTier } from '../../services/subscriptionApi';

interface Props {
  currentTier: PlanTier;
  realStatus?: RealSubStatus;
  realSub?: RealSubscription | null;
  plans?: PayPalPlan[];
}

function fmtDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BillingTimeline({ currentTier, realStatus, realSub, plans = [] }: Props) {
  const { t } = useTranslation('subscription');

  const scheduledPlan = realSub?.scheduled_plan_id
    ? plans.find((p) => p.plan_id === realSub.scheduled_plan_id)
    : null;

  const billingDate = realSub?.next_billing_date;

  // Only render when there's something to show
  const isDowngradePending = !!scheduledPlan && realStatus === 'ACTIVE';
  const isCancelScheduled = realStatus === 'ACTIVE_CANCEL_SCHEDULED';

  if (!billingDate || (!isDowngradePending && !isCancelScheduled)) return null;

  const currentMeta = TIER_META[currentTier] ?? TIER_META['free'];

  const scheduledTier = scheduledPlan
    ? ((scheduledPlan.displayName ?? scheduledPlan.name).toLowerCase().includes('ultra')
        ? 'ultra'
        : (scheduledPlan.displayName ?? scheduledPlan.name).toLowerCase().includes('pro')
        ? 'pro'
        : 'free')
    : ('free' as PlanTier);

  const nextMeta = isDowngradePending ? TIER_META[scheduledTier] ?? TIER_META['pro'] : null;
  const nextColor = isDowngradePending ? nextMeta!.color : '#ef4444';
  const nextLabel = isDowngradePending
    ? (scheduledPlan!.displayName ?? scheduledPlan!.name)
    : t('timeline_access_ends', 'Subscription ends');
  const nextAmount =
    isDowngradePending && scheduledPlan!.price > 0
      ? `$${scheduledPlan!.price.toFixed(2)}/mo`
      : null;

  return (
    <div className="px-4">
      <div
        className="rounded-[22px] overflow-hidden"
        style={{
          background: 'var(--tg-secondary, #1e2733)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <CalendarClock size={13} className="text-tg-hint opacity-60" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-tg-hint opacity-70">
            {t('subscription_lifecycle', 'Billing Timeline')}
          </span>
        </div>

        {/* Timeline rows */}
        <div className="px-4 py-3.5 space-y-0">
          {/* Row 1: NOW */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: `${currentMeta.color}1a`,
                border: `1.5px solid ${currentMeta.color}40`,
              }}
            >
              <CheckCircle2 size={13} style={{ color: currentMeta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-tg-hint font-medium uppercase tracking-wider opacity-60">
                {t('timeline_now', 'Currently active')}
              </div>
              <div className="text-[14px] font-bold text-tg-text leading-tight">
                {currentMeta.label}
              </div>
            </div>
            {realSub?.amount && realSub.amount > 0 && (
              <div className="text-[12px] font-semibold text-tg-hint shrink-0">
                ${realSub.amount.toFixed(2)}/mo
              </div>
            )}
          </div>

          {/* Connector */}
          <div
            className="ml-[13px] w-px h-5 my-0.5"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          />

          {/* Row 2: DATE */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-white/25" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-tg-hint font-medium uppercase tracking-wider opacity-60">
                {t('timeline_on_date', 'Next billing date')}
              </div>
              <div className="text-[14px] font-bold text-tg-text leading-tight">
                {fmtDate(billingDate)}
              </div>
            </div>
          </div>

          {/* Connector */}
          <div
            className="ml-[13px] w-px h-5 my-0.5"
            style={{ background: `${nextColor}35` }}
          />

          {/* Row 3: NEXT STATE */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: `${nextColor}18`,
                border: `1.5px solid ${nextColor}35`,
              }}
            >
              {isDowngradePending ? (
                <ArrowDown size={13} style={{ color: nextColor }} />
              ) : (
                <XCircle size={13} style={{ color: nextColor }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: `${nextColor}99` }}
              >
                {isDowngradePending
                  ? t('timeline_plan_changes', 'Changes to')
                  : t('timeline_access_ends_label', 'Access ends')}
              </div>
              <div
                className="text-[14px] font-bold leading-tight"
                style={{ color: nextColor }}
              >
                {nextLabel}
              </div>
            </div>
            {nextAmount && (
              <div
                className="text-[12px] font-semibold shrink-0"
                style={{ color: `${nextColor}99` }}
              >
                {nextAmount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
