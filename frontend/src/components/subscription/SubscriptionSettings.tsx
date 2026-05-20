import { useTranslation } from 'react-i18next';
import type { ProFeatures, RealSubStatus, RealSubscription } from '../../services/subscriptionApi';
import { RefreshCcw, AlertTriangle, XCircle, Clock, Ban, Play, CalendarDays } from 'lucide-react';

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
  actionLoading?: boolean;
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
  actionLoading,
}: Props) {
  const { t } = useTranslation('subscription');
  const { subscription } = features;
  const tier = subscription.tier;
  const hasPendingChange = subscription.change?.status === 'pending';
  const hasRealActions = realStatus === 'ACTIVE' || realStatus === 'SUSPENDED';

  if (tier === 'free' && !hasPendingChange && !hasRealActions) return null;

  return (
    <section className="px-5 mt-4">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
        {t('subscription_settings', 'Settings')}
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden border border-tg-border/40 shadow-sm">
        <div className="flex flex-col">
          
          {/* ── Auto Renew ── */}
          {tier !== 'free' && (
            <button
              className={`w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors ${
                hasPendingChange ? 'border-b border-tg-border/20' : ''
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
                className={`flex-shrink-0 ml-3 w-[46px] h-[26px] rounded-full p-1 transition-colors duration-300 ease-in-out relative ${
                  subscription.auto_renew ? 'bg-tg-accent' : 'bg-tg-hint/30'
                }`}
                role="switch"
                aria-checked={subscription.auto_renew}
              >
                <div
                  className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                    subscription.auto_renew ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
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

          {/* ── Cancelar suscripción PayPal ── */}
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