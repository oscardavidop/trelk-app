import { useTranslation } from 'react-i18next';
import type { ProFeatures, RealSubStatus, RealSubscription, PayPalPlan } from '../../services/subscriptionApi';
import { RefreshCcw, AlertTriangle, XCircle, Clock, Ban, Play, CalendarDays, CalendarX2, ArrowDownCircle, RotateCcw } from 'lucide-react';

interface Props {
  features: ProFeatures;
  onAutoRenewToggle: () => void;
  onCancelChange: () => void;
  haptic?: any;
  // ── Real PayPal ──
  realStatus?: RealSubStatus;
  realSub?: RealSubscription | null;
  onCancelReal?: () => void;
  onResume?: () => void;
  onResubscribe?: () => void;
  actionLoading?: boolean;
  /** Plans list for resolving scheduled_plan_id name */
  plans?: PayPalPlan[];
  /** Cancel a scheduled downgrade */
  onCancelDowngrade?: () => void;
}

export default function SubscriptionSettings({
  features,
  onAutoRenewToggle,
  onCancelChange,
  haptic,
  realStatus,
  realSub,
  onCancelReal,
  onResume,
  onResubscribe,
  actionLoading,
  plans = [],
  onCancelDowngrade,
}: Props) {
  const { t } = useTranslation('subscription');
  const { subscription } = features;
  const tier = subscription.tier;
  const hasPendingChange = subscription.change?.status === 'pending';
  const hasRealActions = realStatus === 'ACTIVE' || realStatus === 'SUSPENDED' || realStatus === 'ACTIVE_CANCEL_SCHEDULED';

  // Resolve scheduled downgrade plan name from plans list
  const scheduledPlan = realSub?.scheduled_plan_id
    ? plans.find((p) => p.plan_id === realSub.scheduled_plan_id)
    : null;

  if (tier === 'free' && !hasPendingChange && !hasRealActions) return null;

  return (
    <section className="px-5 mt-4">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
        {t('subscription_settings', 'Settings')}
      </h2>

      <div className="bg-tg-secondary rounded-[20px] overflow-hidden border border-tg-border/40 shadow-sm">
        <div className="flex flex-col">

          {/* ── Auto Renew ── */}
          {

            realStatus !== 'ACTIVE_CANCEL_SCHEDULED' && (
              tier !== 'free' && (
                <button
                  className={`w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors ${hasPendingChange ? 'border-b border-tg-border/20' : ''
                    }`}
                  onClick={() => {
                    haptic?.impactOccurred('light');
                    onAutoRenewToggle();
                  }}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                      <RefreshCcw size={18} className="text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-semibold text-tg-text leading-tight">{t('auto_renew', 'Auto-Renew')}</div>
                      <div className="text-[13px] font-medium text-tg-hint mt-0.5 truncate">
                        {subscription.auto_renew ? t('will_auto_renew') : t('will_not_renew')}
                      </div>
                    </div>
                  </div>


                  {/* Tailwind Custom Toggle Switch */}

                  <div
                    className={`flex-shrink-0 ml-3 w-[46px] h-[26px] rounded-full p-1 transition-colors duration-300 ease-in-out relative ${subscription.auto_renew ? 'bg-tg-accent' : 'bg-tg-hint/30'
                      }`}
                    role="switch"
                    aria-checked={subscription.auto_renew}
                  >
                    <div
                      className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${subscription.auto_renew ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </div>

                </button>
              )
            )}

          {/* ── Pending Change ── */}
          {hasPendingChange && (
            <div className="p-4 bg-amber-500/5">
              <div className="flex items-start gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <AlertTriangle size={18} className="text-amber-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-amber-500 mb-1">
                    {t('pending_change', 'Pending Change')}
                  </div>

                  <div className="text-[13px] text-tg-hint leading-snug bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-tg-border/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-tg-text font-bold capitalize">{subscription.change!.changed_from}</span>
                      <span className="text-tg-hint">→</span>
                      <span className="text-tg-text font-bold capitalize">{subscription.change!.new_plan}</span>
                    </div>
                    {subscription.change!.change_date && (
                      <div className="text-[12px] font-medium opacity-80 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(subscription.change!.change_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic?.impactOccurred('medium');
                      onCancelChange();
                    }}
                    className="mt-3.5 flex items-center gap-1.5 text-[13px] text-red-500 font-bold active:scale-95 transition-transform w-max bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 shadow-sm"
                  >
                    <XCircle size={14} />
                    {t('cancel_change', 'Cancel Change')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Próxima factura (PayPal ACTIVE) ── */}
          {realStatus === 'ACTIVE' && realSub?.next_billing_date && (
            <div className={`p-4 bg-sky-500/5 ${hasPendingChange ? 'border-t border-tg-border/20' : ''}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <CalendarDays size={18} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight">
                    {t('next_billing', 'Next billing')}
                  </div>
                  <div className="text-[13px] text-tg-hint mt-0.5">
                    {new Date(realSub.next_billing_date).toLocaleDateString()} ·{' '}
                    <span className="font-semibold text-tg-text">
                      {realSub.currency} {realSub.amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Cancelar suscripción PayPal ── (solo si ACTIVE) */}
          {realStatus === 'ACTIVE' && onCancelReal && (
            <div className="border-t border-tg-border/20">
              <button
                onClick={() => {
                  haptic?.impactOccurred('medium');
                  onCancelReal();
                }}
                disabled={actionLoading}
                className="w-full flex items-center gap-3.5 p-4 text-left active:bg-red-500/5 transition-colors disabled:opacity-50"
              >
                <div className="w-[34px] h-[34px] rounded-[10px] bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Ban size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-semibold text-red-500 leading-tight">
                    {t('cancel_subscription', 'Cancel Subscription')}
                  </div>
                  <div className="text-[13px] font-medium text-tg-hint mt-0.5">
                    {t('cancel_subscription_desc', 'Access continues until end of billing period')}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ── Cancellation scheduled (ACTIVE_CANCEL_SCHEDULED) ── */}
          {realStatus === 'ACTIVE_CANCEL_SCHEDULED' && (
            <div className="border-t border-tg-border/20 p-4 bg-amber-500/5">
              <div className="flex items-start gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CalendarX2 size={18} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-amber-500 mb-1">
                    {t('cancel_scheduled_title', 'Cancellation Scheduled')}
                  </div>
                  <div className="text-[13px] text-tg-hint leading-snug mb-2">
                    {t('cancel_scheduled_desc', 'Your subscription will not renew. You keep full access until:')}
                  </div>
                  {realSub?.next_billing_date && (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] mb-3"
                      style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}
                    >
                      <CalendarDays size={13} className="text-amber-500" />
                      <span className="text-[13px] font-bold text-amber-500">
                        {new Date(realSub.next_billing_date).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  <div className="text-[12px] text-tg-hint opacity-70 mb-3">
                    {t('cancel_scheduled_features_note', 'All premium features remain active until then.')}
                  </div>
                  {onResubscribe && (
                    <button
                      onClick={() => {
                        haptic?.impactOccurred('medium');
                        onResubscribe();
                      }}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-[13px] text-tg-accent font-bold active:scale-95 transition-transform bg-tg-accent/10 px-3 py-1.5 rounded-full border border-tg-accent/20 shadow-sm disabled:opacity-50"
                    >
                      <RefreshCcw size={14} />
                      {t('resubscribe', 'Resubscribe')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Downgrade scheduled ── */}
          {scheduledPlan && realStatus === 'ACTIVE' && (
            <div className="border-t border-tg-border/20 p-4 bg-blue-500/5">
              <div className="flex items-start gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowDownCircle size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-blue-400 mb-1">
                    {t('downgrade_pending_title', 'Downgrade Scheduled')}
                  </div>
                  <div className="text-[13px] text-tg-hint leading-snug">
                    {t('downgrade_pending_desc', 'Your plan will change to')}
                    {' '}
                    <span className="font-bold text-tg-text capitalize">{scheduledPlan.displayName}</span>
                    {' '}
                    {t('downgrade_pending_at', 'at your next billing cycle.')}
                  </div>
                  {realSub?.next_billing_date && (
                    <div className="text-[12px] text-tg-hint mt-1.5 flex items-center gap-1">
                      <Clock size={11} className="opacity-60" />
                      {t('downgrade_effective', 'Effective on')}{' '}
                      <span className="font-semibold">
                        {new Date(realSub.next_billing_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {onCancelDowngrade && (
                    <button
                      onClick={() => { haptic?.impactOccurred('medium'); onCancelDowngrade(); }}
                      disabled={actionLoading}
                      className="mt-3 flex items-center gap-1.5 text-[13px] text-blue-400 font-bold active:scale-95 transition-transform bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20 shadow-sm disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {t('undo_downgrade', 'Keep Current Plan')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Reanudar suscripción suspendida ── */}
          {realStatus === 'SUSPENDED' && onResume && (
            <div className={`p-4 bg-violet-500/5 ${tier !== 'free' || hasPendingChange ? 'border-t border-tg-border/20' : ''}`}>
              <div className="flex items-start gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-violet-500 mb-1">
                    {t('subscription_suspended', 'Subscription Suspended')}
                  </div>
                  <div className="text-[13px] text-tg-hint leading-snug">
                    {t('subscription_suspended_desc', 'Your subscription is suspended. Resume to restore access.')}
                  </div>
                  <button
                    onClick={() => {
                      haptic?.impactOccurred('medium');
                      onResume();
                    }}
                    disabled={actionLoading}
                    className="mt-3 flex items-center gap-1.5 text-[13px] text-violet-500 font-bold active:scale-95 transition-transform bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20 shadow-sm disabled:opacity-50"
                  >
                    <Play size={14} />
                    {t('resume_subscription', 'Resume Subscription')}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}