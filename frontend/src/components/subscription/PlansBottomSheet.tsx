import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X, Crown, Zap, Sparkles, Check, Loader2, Gem,
  ArrowUp, ArrowDown, Star, Clock, AlertTriangle, BadgePercent, TrendingUp,
  CreditCard, RefreshCw,
} from 'lucide-react';
import type { PayPalPlan, RealSubStatus } from '../../services/subscriptionApi';
import { createStarsInvoice, fetchRealStatus } from '../../services/subscriptionApi';

// ── Plan visual metadata keyed by plan name slug from backend ──────────────

interface PlanFeature {
  label: string;
  included: boolean;
}

interface PlanVisualMeta {
  Icon: React.ElementType;
  color: string;
  gradient: string;
  badge: 'popular' | 'best_value' | 'starter' | 'most_powerful' | null;
  features: PlanFeature[];
}

const PLAN_VISUAL_META: Record<string, PlanVisualMeta> = {
  basic: {
    Icon: Zap,
    color: '#38bdf8',
    gradient: 'from-sky-500/20 to-cyan-700/5',
    badge: 'starter',
    features: [
      { label: '30 downloads / day', included: true },
      { label: '50 AI requests / day', included: true },
      { label: 'QR code generation', included: true },
      { label: 'Premium AI models', included: false },
      { label: 'Custom commands', included: false },
      { label: 'High-priority queue', included: false },
      { label: 'Live chat access', included: false },
    ],
  },
  pro: {
    Icon: Crown,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-orange-700/5',
    badge: 'popular',
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
  ultra: {
    Icon: Sparkles,
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-fuchsia-700/5',
    badge: 'best_value',
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
};

const FALLBACK_VISUAL: PlanVisualMeta = {
  Icon: Gem,
  color: '#6366f1',
  gradient: 'from-indigo-500/20 to-indigo-700/5',
  badge: null,
  features: [],
};

function getVisualMeta(planName: string): PlanVisualMeta {
  return PLAN_VISUAL_META[planName.toLowerCase()] ?? FALLBACK_VISUAL;
}

function getBadgeColor(badge: PlanVisualMeta['badge']): string {
  switch (badge) {
    case 'popular':       return '#f59e0b';
    case 'best_value':    return '#22c55e';
    case 'starter':       return '#38bdf8';
    case 'most_powerful': return '#8b5cf6';
    default:              return '#6366f1';
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type PlanTier = 'free' | 'basic' | 'pro' | 'ultra' | string;

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

// ── Component ──────────────────────────────────────────────────────────────

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

  // Default: first plan above current tier, or first available
  const computeDefault = useCallback((): string => {
    if (realPlans.length === 0) return 'pro';
    const names = realPlans.map((p) => p.name.toLowerCase());
    if (currentTier === 'free') return names[0];
    const curIdx = names.indexOf(currentTier.toLowerCase());
    if (curIdx >= 0 && curIdx < names.length - 1) return names[curIdx + 1];
    return names[names.length - 1];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedName, setSelectedName] = useState<string>(computeDefault);
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stars'>('paypal');
  const [starsLoading, setStarsLoading] = useState(false);
  const [starsStatus, setStarsStatus] = useState<null | 'activating' | 'error'>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedName(computeDefault());
      setMounted(true);
      setPaymentMethod('paypal');
      setStarsStatus(null);
      setStarsLoading(false);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 80) handleClose();
    startYRef.current = null;
  };

  // ── Derived state ────────────────────────────────────────────────────────
  const selectedPlan = realPlans.find((p) => p.name.toLowerCase() === selectedName) ?? null;
  const visual = getVisualMeta(selectedName);
  const isCurrentPlan = selectedName.toLowerCase() === currentTier.toLowerCase();
  const isRealActive = realStatus === 'ACTIVE';

  const scheduledPlanName = scheduledPlanId
    ? (realPlans.find((p) => p.plan_id === scheduledPlanId)?.name.toLowerCase() ?? null)
    : null;

  const isAlreadyScheduled = !!scheduledPlanName && selectedName === scheduledPlanName && !isCurrentPlan;
  const isBlockedByCancel = realStatus === 'ACTIVE_CANCEL_SCHEDULED' && selectedName !== currentTier.toLowerCase();

  // Upgrade vs. downgrade by backend-ordered plan list (sorted by price asc)
  const tierOrder = realPlans.map((p) => p.name.toLowerCase());
  const isUpgrade = tierOrder.indexOf(selectedName) > tierOrder.indexOf(currentTier.toLowerCase());

  // ── Stars payment flow ───────────────────────────────────────────────────

  // Reset payment method when plan changes
  useEffect(() => {
    setPaymentMethod('paypal');
    setStarsStatus(null);
  }, [selectedName]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pollActivation = useCallback(() => {
    let attempts = 0;
    const MAX = 10; // 10 × 3s = 30s
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetchRealStatus();
        if (res.status === 'ACTIVE' || res.isPremium) {
          clearInterval(pollRef.current!);
          setStarsStatus(null);
          handleClose();
          return;
        }
      } catch { /* ignore */ }
      if (attempts >= MAX) {
        clearInterval(pollRef.current!);
        setStarsStatus('error');
      }
    }, 3_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleClose]);

  const handleStarsPayment = useCallback(async () => {
    if (!selectedPlan || starsLoading) return;
    setStarsLoading(true);
    setStarsStatus(null);

    try {
      const { invoiceUrl } = await createStarsInvoice(selectedPlan.name);

      const tgWebApp = (window as any).Telegram?.WebApp;
      if (!tgWebApp?.openInvoice) {
        // Fallback for testing outside Telegram
        window.open(invoiceUrl, '_blank');
        setStarsLoading(false);
        return;
      }

      tgWebApp.openInvoice(invoiceUrl, (status: string) => {
        if (status === 'paid') {
          setStarsStatus('activating');
          setStarsLoading(false);
          pollActivation();
        } else {
          setStarsLoading(false);
        }
      });
    } catch {
      setStarsLoading(false);
      setStarsStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, starsLoading, pollActivation]);

  // Show method selector only for new subscriptions where the plan supports Stars
  const showMethodSelector =
    !isRealActive &&
    !isCurrentPlan &&
    !isBlockedByCancel &&
    !isAlreadyScheduled &&
    !!selectedPlan?.stars_price;

  // ── Handlers / labels ────────────────────────────────────────────────────
  const handleCTA = () => {
    if (!selectedPlan || isCurrentPlan || actionLoading || isBlockedByCancel || isAlreadyScheduled) return;
    if (isRealActive && realSubscriptionId && onRevise) {
      onRevise(realSubscriptionId, selectedPlan.plan_id);
    } else if (showMethodSelector && paymentMethod === 'stars') {
      handleStarsPayment();
    } else if (onCheckout) {
      onCheckout(selectedPlan.plan_id);
    }
  };

  const ctaLabel = (): string => {
    if (isCurrentPlan) return t('plan_current', 'Your Current Plan');
    if (isAlreadyScheduled) return t('plan_already_scheduled', 'Scheduled for next cycle');
    if (isBlockedByCancel) return t('plan_blocked_cancel', 'Resubscribe to change plan');
    if (!selectedPlan) return t('subscribe_to', { plan: selectedName });
    if (showMethodSelector && paymentMethod === 'stars') {
      return t('stars_pay_cta', { amount: selectedPlan.stars_price });
    }
    if (isRealActive) {
      return isUpgrade
        ? t('upgrade_cta', { plan: selectedPlan.displayName ?? selectedPlan.name, price: selectedPlan.price })
        : t('switch_cta', { plan: selectedPlan.displayName ?? selectedPlan.name, price: selectedPlan.price });
    }
    return t('subscribe_cta', { price: selectedPlan.price });
  };

  const ctaIcon = (): React.ReactNode => {
    if (actionLoading || starsLoading) return <Loader2 size={18} className="animate-spin" />;
    if (isAlreadyScheduled) return <Clock size={17} strokeWidth={2.5} />;
    if (isBlockedByCancel) return <AlertTriangle size={17} strokeWidth={2.5} />;
    if (showMethodSelector && paymentMethod === 'stars') return <Star size={17} fill="currentColor" strokeWidth={0} />;
    if (isRealActive && !isCurrentPlan) {
      return isUpgrade
        ? <ArrowUp size={17} strokeWidth={2.5} />
        : <ArrowDown size={17} strokeWidth={2.5} />;
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
      {/* ── Sheet ── */}
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
        <div
          className="flex justify-center pt-2 pb-1 flex-shrink-0 sticky top-0 z-10"
          style={{ background: 'var(--tg-bg, #1a1b1c)' }}
        >
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(125,139,151,0.3)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-5 flex-shrink-0">
          <div>
            <h2 className="text-[24px] font-bold text-tg-text leading-tight">
              {t('choose_plan', 'Upgrade Your Experience')}
            </h2>
            <p className="text-[13px] text-tg-hint mt-0.5">
              {t('choose_plan_subtitle', 'Upgrade anytime · Cancel anytime')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(125,139,151,0.15)' }}
          >
            <X size={17} className="text-tg-hint" />
          </button>
        </div>

        {/* ── PLAN SELECTOR: compact segmented control ──────────────────── */}
        <div className="px-5 mb-4">
          <div
            className="flex gap-1 p-1 rounded-[18px]"
            style={{ background: 'rgba(125,139,151,0.1)' }}
          >
            {realPlans.map((plan) => {
              const name = plan.name.toLowerCase();
              const vis = getVisualMeta(name);
              const isSel = name === selectedName;
              const isCur = name === currentTier.toLowerCase();
              const isSched = name === scheduledPlanName && name !== currentTier.toLowerCase();

              return (
                <button
                  key={plan.plan_id}
                  onClick={() => setSelectedName(name)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-[14px] transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: isSel
                      ? `linear-gradient(150deg, ${vis.color}22 0%, ${vis.color}0c 100%)`
                      : 'transparent',
                    border: isSel ? `1px solid ${vis.color}48` : '1px solid transparent',
                    boxShadow: isSel ? `0 2px 14px ${vis.color}18` : 'none',
                  }}
                >
                  {/* Current / scheduled dot */}
                  {(isCur || isSched) && (
                    <div
                      className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: isSched ? '#38bdf8' : vis.color }}
                    />
                  )}

                  {/* Icon + name on one line */}
                  <div className="flex items-center gap-1.5">
                    <vis.Icon
                      size={13}
                      style={{ color: isSel ? vis.color : 'var(--tg-hint, #7d8b97)', opacity: isSel ? 1 : 0.6 }}
                    />
                    <span
                      className="text-[13px] font-bold leading-none"
                      style={{ color: isSel ? vis.color : 'var(--tg-hint, #7d8b97)' }}
                    >
                      {plan.displayName ?? plan.name}
                    </span>
                  </div>

                  {/* Price */}
                  <span
                    className="text-[16px] font-semibold leading-none"
                    style={{ color: isSel ? 'var(--tg-text, #fff)' : 'rgba(125,139,151,0.45)' }}
                  >
                    ${plan.price}
                    <span className="text-[10px] opacity-60">/mo</span>
                  </span>

                  {/* Badge — shown only when selected */}
                  {isSel && vis.badge && (
                    <span
                      className="text-[7px] font-extrabold uppercase tracking-[0.1em] px-1.5 py-[2px] rounded-full leading-none mt-0.5"
                      style={{
                        background: `${getBadgeColor(vis.badge)}18`,
                        color: getBadgeColor(vis.badge),
                        border: `1px solid ${getBadgeColor(vis.badge)}30`,
                      }}
                    >
                      {t(`badge_${vis.badge}`, vis.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll-indicator dots (only shown for 3+ plans) */}
          {realPlans.length > 2 && (
            <div className="flex justify-center gap-1.5 mt-3.5 px-5">
              {realPlans.map((p) => {
                const active = p.name.toLowerCase() === selectedName;
                return (
                  <button
                    key={p.plan_id}
                    onClick={() => setSelectedName(p.name.toLowerCase())}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: active ? '20px' : '6px',
                      height: '6px',
                      background: active
                        ? getVisualMeta(p.name.toLowerCase()).color
                        : 'rgba(125,139,151,0.22)',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── SELECTED PLAN DETAIL CARD ───────────────────────────────────── */}
        <div className="px-5 pb-4">
          <div
            className="rounded-[24px] overflow-hidden"
            key={selectedName}
            style={{
              background: 'var(--tg-secondary, #212a33)',
              border: `1.5px solid ${visual.color}35`,
              animation: 'fadeInCard 0.2s ease-out',
            }}
          >
            {/* Card header gradient */}
            <div
              className={`relative px-4 pt-4 pb-3 bg-gradient-to-br ${visual.gradient}`}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Ambient glow */}
              <div
                className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full pointer-events-none"
                style={{
                  background: visual.color,
                  filter: 'blur(44px)',
                  opacity: 0.15,
                  transform: 'translate(35%, -30%)',
                }}
              />

              <div className="relative z-10 flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${visual.color}18`,
                    border: `1.5px solid ${visual.color}35`,
                    boxShadow: `0 0 16px ${visual.color}20`,
                  }}
                >
                  <visual.Icon size={18} style={{ color: visual.color }} />
                </div>

                {/* Name + badges + price */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[21px] font-bold text-tg-text leading-none">
                      {selectedPlan?.displayName ?? selectedName}
                    </span>

                    {isCurrentPlan && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{
                          background: `${visual.color}18`,
                          color: visual.color,
                          border: `1px solid ${visual.color}35`,
                        }}
                      >
                        <Check size={8} strokeWidth={3} />
                        {t('plan_current', 'Current')}
                      </span>
                    )}

                    {visual.badge && !isCurrentPlan && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{
                          background: `${getBadgeColor(visual.badge)}18`,
                          color: getBadgeColor(visual.badge),
                          border: `1px solid ${getBadgeColor(visual.badge)}35`,
                        }}
                      >
                        {visual.badge === 'popular' && <Star size={7} fill="currentColor" strokeWidth={0} />}
                        {visual.badge === 'best_value' && <BadgePercent size={7} strokeWidth={2.5} />}
                        {visual.badge === 'starter' && <TrendingUp size={7} strokeWidth={2.5} />}
                        {visual.badge === 'most_powerful' && <Sparkles size={7} strokeWidth={2} />}
                        {t(`badge_${visual.badge}`, visual.badge)}
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
                    <span className="text-[27px] font-bold text-tg-text leading-none">
                      {selectedPlan ? `$${selectedPlan.price}` : '—'}
                    </span>
                    <span className="text-[13px] text-tg-hint font-medium">
                      {t('per_month', '/month')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="px-4 pt-3 pb-1 space-y-2">
              {visual.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: f.included ? 'rgba(34,197,94,0.1)' : 'rgba(125,139,151,0.07)',
                      border: f.included
                        ? '1px solid rgba(34,197,94,0.22)'
                        : '1px solid rgba(125,139,151,0.12)',
                    }}
                  >
                    <Check
                      size={10}
                      strokeWidth={f.included ? 3 : 2}
                      style={{ color: f.included ? '#22c55e' : 'rgba(125,139,151,0.28)' }}
                    />
                  </div>
                  <span
                    className="text-[14px] leading-tight font-medium"
                    style={{
                      color: f.included ? 'var(--tg-text, #ffffff)' : 'rgba(125,139,151,0.38)',
                      textDecoration: f.included ? 'none' : 'line-through',
                    }}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-4 py-3">
              {/* ── Stars activating overlay ──────────────────────────── */}
              {starsStatus === 'activating' && (
                <div
                  className="w-full py-3.5 rounded-[16px] text-[14px] font-bold text-center flex flex-col items-center justify-center gap-1.5"
                  style={{
                    background: 'rgba(250,204,21,0.08)',
                    border: '1px solid rgba(250,204,21,0.2)',
                    color: '#fbbf24',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {t('stars_activating', 'Activating subscription…')}
                  </div>
                  <span className="text-[11px] opacity-60 font-normal">
                    {t('stars_processing', 'This may take a few seconds')}
                  </span>
                </div>
              )}

              {/* ── Stars error ───────────────────────────────────────── */}
              {starsStatus === 'error' && (
                <div className="mb-2">
                  <div
                    className="w-full py-2.5 rounded-[14px] text-[12px] text-center flex items-center justify-center gap-2 mb-2"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#f87171',
                    }}
                  >
                    <AlertTriangle size={13} strokeWidth={2.5} />
                    {t('stars_activation_error', 'Could not confirm. Please refresh in a moment.')}
                  </div>
                  <button
                    onClick={() => { setStarsStatus(null); setPaymentMethod('paypal'); }}
                    className="w-full py-2.5 rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(125,139,151,0.1)', color: 'var(--tg-hint, #7d8b97)' }}
                  >
                    <RefreshCw size={13} strokeWidth={2.5} />
                    {t('back_to_plan', 'Back to plan')}
                  </button>
                </div>
              )}

              {/* ── Payment method selector ───────────────────────────── */}
              {!starsStatus && showMethodSelector && (
                <div
                  className="flex gap-1.5 mb-3 p-1 rounded-[14px]"
                  style={{ background: 'rgba(125,139,151,0.07)' }}
                >
                  {/* PayPal tab */}
                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className="flex-1 flex flex-col items-center py-2.5 rounded-[11px] transition-all duration-200 gap-0.5"
                    style={{
                      background: paymentMethod === 'paypal'
                        ? 'rgba(0,122,255,0.1)'
                        : 'transparent',
                      border: paymentMethod === 'paypal'
                        ? '1px solid rgba(0,122,255,0.25)'
                        : '1px solid transparent',
                    }}
                  >
                    <CreditCard
                      size={14}
                      style={{ color: paymentMethod === 'paypal' ? '#007aff' : 'var(--tg-hint, #7d8b97)', opacity: paymentMethod === 'paypal' ? 1 : 0.5 }}
                    />
                    <span
                      className="text-[11px] font-bold leading-none"
                      style={{ color: paymentMethod === 'paypal' ? '#007aff' : 'var(--tg-hint, #7d8b97)', opacity: paymentMethod === 'paypal' ? 1 : 0.5 }}
                    >
                      {t('payment_method_paypal', 'PayPal')}
                    </span>
                    <span
                      className="text-[9px] leading-none"
                      style={{ color: 'rgba(125,139,151,0.5)' }}
                    >
                      {t('payment_method_paypal_desc', 'Auto billing')}
                    </span>
                  </button>

                  {/* Stars tab */}
                  <button
                    onClick={() => setPaymentMethod('stars')}
                    className="flex-1 flex flex-col items-center py-2.5 rounded-[11px] transition-all duration-200 gap-0.5"
                    style={{
                      background: paymentMethod === 'stars'
                        ? 'rgba(250,204,21,0.1)'
                        : 'transparent',
                      border: paymentMethod === 'stars'
                        ? '1px solid rgba(250,204,21,0.3)'
                        : '1px solid transparent',
                    }}
                  >
                    <Star
                      size={14}
                      fill={paymentMethod === 'stars' ? '#fbbf24' : 'none'}
                      style={{ color: paymentMethod === 'stars' ? '#fbbf24' : 'var(--tg-hint, #7d8b97)', opacity: paymentMethod === 'stars' ? 1 : 0.5 }}
                    />
                    <span
                      className="text-[11px] font-bold leading-none"
                      style={{ color: paymentMethod === 'stars' ? '#fbbf24' : 'var(--tg-hint, #7d8b97)', opacity: paymentMethod === 'stars' ? 1 : 0.5 }}
                    >
                      {t('payment_method_stars', 'Stars')}
                    </span>
                    <span
                      className="text-[9px] leading-none"
                      style={{ color: 'rgba(125,139,151,0.5)' }}
                    >
                      {selectedPlan?.stars_price
                        ? t('stars_amount', { amount: selectedPlan.stars_price })
                        : t('stars_access_label', '30 days')}
                    </span>
                  </button>
                </div>
              )}

              {/* Stars renewal note */}
              {!starsStatus && showMethodSelector && paymentMethod === 'stars' && (
                <p className="text-center text-[10px] mb-2" style={{ color: 'rgba(125,139,151,0.45)' }}>
                  {t('stars_renewal_note', 'Manual renewal · No auto-charge')}
                </p>
              )}

              {/* Main CTA */}
              {!starsStatus && (
                isCurrentPlan ? (
                  <div
                    className="w-full py-3.5 rounded-[16px] text-[14px] font-bold text-center flex items-center justify-center gap-2"
                    style={{
                      background: `${visual.color}12`,
                      color: visual.color,
                      border: `1px solid ${visual.color}25`,
                    }}
                  >
                    <Check size={15} strokeWidth={3} />
                    {t('plan_current', 'Your Current Plan')}
                  </div>
                ) : isBlockedByCancel || isAlreadyScheduled ? (
                  <div
                    className="w-full py-3.5 rounded-[16px] text-[14px] font-bold text-center flex items-center justify-center gap-2"
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
                    disabled={actionLoading || starsLoading || !selectedPlan}
                    className="w-full py-3.5 rounded-[16px] text-white text-[15px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                    style={paymentMethod === 'stars' && showMethodSelector ? {
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      boxShadow: '0 4px 20px rgba(251,191,36,0.35), 0 1px 0 rgba(255,255,255,0.1) inset',
                    } : {
                      background: `linear-gradient(135deg, ${visual.color} 0%, ${visual.color}cc 100%)`,
                      boxShadow: `0 4px 20px ${visual.color}40, 0 1px 0 rgba(255,255,255,0.1) inset`,
                    }}
                  >
                    {ctaIcon()}
                    {ctaLabel()}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ── FREE PLAN (secondary option) ──────────────────────────────── */}
          <div className="mt-5 mb-2">
            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(125,139,151,0.1)' }} />
              <span className="text-[11px] font-semibold text-tg-hint opacity-45 uppercase tracking-wider">
                {t('or_continue_free', 'or continue with')}
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(125,139,151,0.1)' }} />
            </div>

            {/* Free card */}
            <div
              className="rounded-[20px] p-3 flex items-center gap-4"
              style={{
                background: 'rgba(125,139,151,0.05)',
                border: currentTier === 'free'
                  ? '1px solid rgba(156,163,175,0.28)'
                  : '1px solid rgba(125,139,151,0.08)',
              }}
            >
              <div
                className="w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(156,163,175,0.08)',
                  border: '1px solid rgba(156,163,175,0.16)',
                }}
              >
                <Zap size={17} className="text-gray-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[15px] font-bold text-tg-hint opacity-70">
                    {t('plan_free', 'Free')}
                  </span>
                  {currentTier === 'free' && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(156,163,175,0.12)',
                        color: '#9ca3af',
                        border: '1px solid rgba(156,163,175,0.2)',
                      }}
                    >
                      {t('plan_current', 'Current')}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-tg-hint opacity-50 leading-tight">
                  {t('free_plan_limits', 'Limited features · No payment needed')}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-[18px] font-bold text-tg-hint opacity-40">$0</span>
                <p className="text-[10px] text-tg-hint opacity-35">/mo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing note */}
        <p
          className="text-[11px] text-center pb-3 px-6 font-medium"
          style={{ color: 'rgba(125,139,151,0.38)' }}
        >
          {showMethodSelector && paymentMethod === 'stars'
            ? t('stars_renewal_note', 'Manual renewal · No auto-charge')
            : t('paypal_billing_note', 'Billed monthly via PayPal · Cancel anytime')}
        </p>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
