import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Crown, Zap, Sparkles, Check, Loader2, ArrowUp, ArrowDown, Star, Clock, AlertTriangle } from 'lucide-react';
import type { PayPalPlan, RealSubStatus } from '../../services/subscriptionApi';

type PlanTier = 'free' | 'pro' | 'ultra';

interface PlanMeta {
  tier: PlanTier;
  name: string;
  defaultPrice: string;
  Icon: React.ElementType;
  color: string;
  gradient: string;
  popular?: boolean;
  features: { label: string; included: boolean }[];
}

const PLAN_DEFS: PlanMeta[] = [
  {
    tier: 'free',
    name: 'Free',
    defaultPrice: '$0',
    Icon: Zap,
    color: '#9ca3af',
    gradient: 'from-gray-500/15 to-gray-900/5',
    features: [
      { label: '30 downloads / day', included: true },
      { label: '50 AI requests / day', included: true },
      { label: 'QR code generation', included: true },
      { label: 'Premium AI models', included: false },
      { label: 'Custom commands', included: false },
      { label: 'High-priority queue', included: false },
      { label: 'Priority support', included: false },
      { label: 'Live chat access', included: false },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    defaultPrice: '$9.99',
    Icon: Crown,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-orange-700/5',
    popular: true,
    features: [
      { label: '100 downloads / day', included: true },
      { label: '200 AI requests / day', included: true },
      { label: '75 premium AI requests / day', included: true },
      { label: 'QR code generation', included: true },
      { label: '50 custom commands', included: true },
      { label: 'High-priority queue', included: true },
      { label: 'Priority support', included: true },
      { label: 'Live chat access', included: false },
    ],
  },
  {
    tier: 'ultra',
    name: 'Ultra',
    defaultPrice: '$29.99',
    Icon: Sparkles,
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-fuchsia-700/5',
    features: [
      { label: '200 downloads / day', included: true },
      { label: '500 AI requests / day', included: true },
      { label: '150 premium AI requests / day', included: true },
      { label: 'QR code generation', included: true },
      { label: '75 custom commands', included: true },
      { label: 'Ultra-priority queue', included: true },
      { label: 'Priority support', included: true },
      { label: 'Live chat access', included: true },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTier: PlanTier;
  realStatus?: RealSubStatus;
  realSubscriptionId?: string | null;
  realPlans?: PayPalPlan[];
  onCheckout?: (planId: string) => void;
  onRevise?: (subscriptionId: string, planId: string) => void;
  actionLoading?: boolean;
  /** PayPal plan_id of a pending scheduled downgrade, if any */
  scheduledPlanId?: string | null;
}

export default function PlansBottomSheet({
  isOpen,
  onClose,
  currentTier,
  realStatus,
  realSubscriptionId,
  realPlans = [],
  onCheckout,
  onRevise,
  actionLoading,
  scheduledPlanId,
}: Props) {
  const { t } = useTranslation('subscription');

  const defaultSelected = (): PlanTier => {
    if (currentTier === 'free') return 'pro';
    if (currentTier === 'pro') return 'ultra';
    return 'ultra';
  };

  const [selectedTier, setSelectedTier] = useState<PlanTier>(defaultSelected);
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(defaultSelected());
      setMounted(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Touch drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.changedTouches[0].clientY - startYRef.current;
    if (delta > 80) handleClose();
    startYRef.current = null;
  };

  const realPlanMap = new Map<string, PayPalPlan>(
    realPlans.map((p) => [p.name.toLowerCase(), p])
  );

  // Determine which tier (if any) has a scheduled downgrade
  const scheduledTier: PlanTier | null = scheduledPlanId
    ? ((realPlans.find((p) => p.plan_id === scheduledPlanId)?.name.toLowerCase() as PlanTier) ?? null)
    : null;

  const selected = PLAN_DEFS.find((p) => p.tier === selectedTier)!;
  const isCurrentPlan = selectedTier === currentTier;
  const isRealActive = realStatus === 'ACTIVE';
  // Block plan changes when cancellation is scheduled (backend rejects revise)
  const isBlockedByCancel = realStatus === 'ACTIVE_CANCEL_SCHEDULED' && selectedTier !== currentTier;
  const realPlan = realPlanMap.get(selectedTier);
  // Mark when the selected plan is exactly the one already scheduled for next cycle
  const isAlreadyScheduled = !!scheduledTier && selectedTier === scheduledTier && !isCurrentPlan;
  const tiers: PlanTier[] = ['free', 'pro', 'ultra'];

  const handleCTA = () => {
    if (!realPlan || isCurrentPlan || actionLoading || isBlockedByCancel || isAlreadyScheduled) return;
    if (isRealActive && realSubscriptionId && onRevise) {
      onRevise(realSubscriptionId, realPlan.plan_id);
    } else if (onCheckout) {
      onCheckout(realPlan.plan_id);
    }
  };

  const ctaLabel = () => {
    if (isCurrentPlan) return t('plan_current', 'Your Current Plan');
    if (isAlreadyScheduled) return t('plan_already_scheduled', 'Scheduled for next cycle');
    if (isBlockedByCancel) return t('plan_blocked_cancel', 'Resubscribe to change plan');
    if (!realPlan) return t('subscribe_to', { plan: t(`plan_${selected.tier}`, selected.name) });
    if (isRealActive) {
      const isUpgrade = tiers.indexOf(selectedTier) > tiers.indexOf(currentTier);
      return isUpgrade
        ? t('upgrade_cta', { plan: t(`plan_${selected.tier}`, selected.name), price: realPlan.price })
        : t('switch_cta', { plan: t(`plan_${selected.tier}`, selected.name), price: realPlan.price });
    }
    return t('subscribe_cta', { price: realPlan.price });
  };

  const ctaIcon = () => {
    if (actionLoading) return <Loader2 size={18} className="animate-spin" />;
    if (isAlreadyScheduled) return <Clock size={17} strokeWidth={2.5} />;
    if (isBlockedByCancel) return <AlertTriangle size={17} strokeWidth={2.5} />;
    if (isRealActive && !isCurrentPlan) {
      const isUpgrade = tiers.indexOf(selectedTier) > tiers.indexOf(currentTier);
      return isUpgrade ? <ArrowUp size={17} strokeWidth={2.5} /> : <ArrowDown size={17} strokeWidth={2.5} />;
    }
    return <Crown size={17} strokeWidth={2} />;
  };

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9100] flex flex-col justify-end"
      style={{
        background: animateIn ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: animateIn ? 'blur(6px)' : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'var(--tg-bg, #1a1b1c)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '92dvh',
          overflowY: 'auto',
          transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sticky top-0 z-10" style={{ background: 'var(--tg-bg, #1a1b1c)' }}>
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(125,139,151,0.3)' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-[20px] font-bold text-tg-text leading-tight">{t('choose_plan', 'Choose a Plan')}</h2>
            <p className="text-[13px] text-tg-hint mt-0.5">{t('choose_plan_subtitle', 'Upgrade anytime · Cancel anytime')}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(125,139,151,0.15)' }}
          >
            <X size={17} className="text-tg-hint" />
          </button>
        </div>

        {/* iOS-style segmented control tabs */}
        <div className="px-5 mb-5 flex-shrink-0">
          <div
            className="flex p-[3px] rounded-[14px] relative"
            style={{ background: 'rgba(125,139,151,0.12)' }}
          >
            {PLAN_DEFS.map((plan) => {
              const isSel = plan.tier === selectedTier;
              const isCur = plan.tier === currentTier;
              const isScheduledTab = !!scheduledTier && plan.tier === scheduledTier && plan.tier !== currentTier;
              return (
                <button
                  key={plan.tier}
                  onClick={() => setSelectedTier(plan.tier)}
                  className="relative flex-1 py-2.5 rounded-[11px] text-[13px] font-semibold transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5"
                  style={{
                    background: isSel ? 'var(--tg-secondary, #1e2733)' : 'transparent',
                    color: isSel ? plan.color : 'var(--tg-hint, #7d8b97)',
                    boxShadow: isSel ? '0 1px 6px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <plan.Icon
                    size={13}
                    style={{ color: isSel ? plan.color : 'var(--tg-hint, #7d8b97)', opacity: isSel ? 1 : 0.6, transition: 'color 0.2s' }}
                  />
                  <span>{t(`plan_${plan.tier}`, plan.name)}</span>
                  {isCur && (
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-0.5"
                      style={{ background: isSel ? plan.color : 'var(--tg-accent, #248BDA)' }}
                    />
                  )}
                  {plan.popular && !isCur && (
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-0.5"
                      style={{ background: '#f59e0b', opacity: isSel ? 1 : 0.5 }}
                    />
                  )}
                  {isScheduledTab && (
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-0.5"
                      style={{ background: '#38bdf8', opacity: isSel ? 1 : 0.65 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan card */}
        <div className="px-5 pb-8">
          <div
            className="rounded-[24px] overflow-hidden transition-all duration-250"
            key={selectedTier}
            style={{
              background: 'var(--tg-secondary, #212a33)',
              border: `1.5px solid ${selected.color}35`,
              animation: 'fadeInCard 0.2s ease-out',
            }}
          >
            {/* Card header gradient */}
            <div
              className={`relative p-5 pb-4 bg-gradient-to-br ${selected.gradient}`}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Background glow */}
              <div
                className="absolute top-0 right-0 w-[150px] h-[150px] rounded-full pointer-events-none"
                style={{
                  background: selected.color,
                  filter: 'blur(45px)',
                  opacity: 0.2,
                  transform: 'translate(30%, -30%)',
                }}
              />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-[56px] h-[56px] rounded-[18px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${selected.color}18`,
                      border: `1.5px solid ${selected.color}35`,
                      boxShadow: `0 0 24px ${selected.color}20`,
                    }}
                  >
                    <selected.Icon className="w-7 h-7" style={{ color: selected.color }} />
                  </div>

                  {/* Name + price */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[22px] font-bold text-tg-text leading-none">{t(`plan_${selected.tier}`, selected.name)}</span>
                      {isCurrentPlan && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                          style={{
                            background: `${selected.color}18`,
                            color: selected.color,
                            border: `1px solid ${selected.color}35`,
                          }}
                        >
                          <Check size={8} strokeWidth={3} />
                          {t('plan_current', 'Current')}
                        </span>
                      )}
                      {selected.popular && !isCurrentPlan && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                          style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(234,88,12,0.12))',
                            color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.3)',
                          }}
                        >
                          <Star size={7} fill="currentColor" strokeWidth={0} />
                          {t('popular_badge', 'Popular')}
                        </span>
                      )}
                      {isAlreadyScheduled && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                          style={{
                            background: 'rgba(56,189,248,0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56,189,248,0.25)',
                          }}
                        >
                          <Clock size={8} strokeWidth={3} />
                          {t('plan_pending', 'Pending')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[26px] font-bold text-tg-text leading-none">
                        {realPlan ? `$${realPlan.price}` : selected.defaultPrice}
                      </span>
                      {selected.tier !== 'free' && (
                        <span className="text-[13px] text-tg-hint font-medium">{t('per_month', '/month')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="p-5 space-y-3.5">
              {selected.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-[21px] h-[21px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: f.included ? 'rgba(34,197,94,0.1)' : 'rgba(125,139,151,0.08)',
                      border: f.included
                        ? '1px solid rgba(34,197,94,0.25)'
                        : '1px solid rgba(125,139,151,0.15)',
                    }}
                  >
                    <Check
                      size={11}
                      strokeWidth={f.included ? 3 : 2}
                      style={{ color: f.included ? '#22c55e' : 'rgba(125,139,151,0.3)' }}
                    />
                  </div>
                  <span
                    className="text-[14px] leading-tight font-medium"
                    style={{
                      color: f.included ? 'var(--tg-text, #ffffff)' : 'rgba(125,139,151,0.4)',
                      textDecoration: f.included ? 'none' : 'line-through',
                    }}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-4">
            {isCurrentPlan || selected.tier === 'free' ? (
              <div
                className="w-full py-4 rounded-[18px] text-[15px] font-bold text-center flex items-center justify-center gap-2"
                style={{
                  background: isCurrentPlan
                    ? `${selected.color}12`
                    : 'rgba(125,139,151,0.07)',
                  color: isCurrentPlan ? selected.color : 'var(--tg-hint, #7d8b97)',
                  border: isCurrentPlan
                    ? `1px solid ${selected.color}25`
                    : '1px solid rgba(125,139,151,0.12)',
                }}
              >
                {isCurrentPlan && <Check size={16} strokeWidth={3} />}
                {isCurrentPlan ? t('plan_current', 'Your Current Plan') : t('plan_free', 'Free Plan')}
              </div>
            ) : isBlockedByCancel || isAlreadyScheduled ? (
              <div
                className="w-full py-4 rounded-[18px] text-[15px] font-bold text-center flex items-center justify-center gap-2"
                style={{
                  background: isBlockedByCancel ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)',
                  color: isBlockedByCancel ? '#f59e0b' : '#38bdf8',
                  border: isBlockedByCancel
                    ? '1px solid rgba(245,158,11,0.2)'
                    : '1px solid rgba(56,189,248,0.2)',
                }}
              >
                {ctaIcon()}
                {ctaLabel()}
              </div>
            ) : (
              <button
                onClick={handleCTA}
                disabled={actionLoading || !realPlan}
                className="w-full py-4 rounded-[18px] text-white text-[16px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${selected.color} 0%, ${selected.color}bb 100%)`,
                  boxShadow: `0 4px 20px ${selected.color}40, 0 1px 0 rgba(255,255,255,0.08) inset`,
                }}
              >
                {ctaIcon()}
                {ctaLabel()}
              </button>
            )}
          </div>

          <p
            className="text-[11px] text-center mt-3 opacity-55 font-medium"
            style={{ color: 'var(--tg-hint, #7d8b97)' }}
          >
            {t('paypal_billing_note', 'Billed monthly via PayPal · Cancel anytime')}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
