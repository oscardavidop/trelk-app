import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '../stores/subscription';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import type { PlanTier } from '../services/subscriptionApi';
import SubscriptionHero, { TIER_META } from '../components/subscription/SubscriptionHero';
import SubscriptionSettings from '../components/subscription/SubscriptionSettings';
import SubscriptionUsage from '../components/subscription/SubscriptionUsage';
import SubscriptionBenefits from '../components/subscription/SubscriptionBenefits';
import PlansBottomSheet from '../components/subscription/PlansBottomSheet';
import BillingTimeline from '../components/subscription/BillingTimeline';
import PremiumSuccessModal, { type SuccessExperiencePayload, type SuccessKind } from '../components/subscription/PremiumSuccessModal';
import StickyHeader from '@/components/StickyHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { Loader2, Crown, CheckCircle2, Clock, Sparkles, ChevronRight, ArrowUpCircle } from 'lucide-react';

const SUCCESS_SHOWN_KEY = 'trelk:lastSuccessExperienceShown';
const PENDING_SUB_KEY = 'trelk:pendingSubscription';
const PENDING_METHOD_KEY = 'trelk:pendingPaymentMethod';
const PENDING_PAYPAL_URL_KEY = 'trelk:pendingPaypalUrl';
const PENDING_PAYPAL_PLAN_KEY = 'trelk:pendingPaypalPlan';
const PENDING_PAYPAL_CREATED_AT_KEY = 'trelk:pendingPaypalCreatedAt';

// ── Main Page ────────────────────────────────────
export default function SubscriptionPage() {
    const { userId } = useParams();
    const { haptic, webApp } = useTelegram();
    const { t } = useTranslation('subscription');
    const showToast = useToastStore((s) => s.show);

    const {
        features, loading, load,
        changePlan, cancelChange, toggleAutoRenew,
        realStatus, realSub, isPremium, realLoading,
        plans, actionLoading,
        pendingSubscriptionId,
        loadRealStatus, loadPlans,
        checkout, revise, cancelReal, resume, cancelDowngrade,
        startPolling, stopPolling,
    } = useSubscriptionStore();


    const [modal, setModal] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        confirmColor?: string;
        action: () => Promise<void>;
    } | null>(null);
    const [plansOpen, setPlansOpen] = useState(false);
    const [openPendingPaymentModal, setOpenPendingPaymentModal] = useState(false);
    const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
    const [successPayload, setSuccessPayload] = useState<SuccessExperiencePayload | null>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const prevWasActiveRef = useRef(false);
    const hadPendingDuringSessionRef = useRef(false);
    const pendingSuccessKindRef = useRef<SuccessKind>('new_purchase');

    // ── Initial load ──────────────────────────────
    useEffect(() => {
        load();
        loadRealStatus();
        loadPlans();
    }, [load, loadRealStatus, loadPlans]);

    // ── Auto-poll if pending sub found in localStorage ─
    useEffect(() => {
        if (pendingSubscriptionId) {
            hadPendingDuringSessionRef.current = true;
            startPolling(pendingSubscriptionId);
        }
        return () => stopPolling();
        // Only run on mount / pendingSubscriptionId change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingSubscriptionId]);

    // ── Premium success modal trigger (stable after polling ACTIVE) ─────────
    useEffect(() => {
        const isNowActive = realStatus === 'ACTIVE' && !!isPremium;
        const justActivated = isNowActive && !prevWasActiveRef.current;
        const fromPendingFlow = isNowActive && hadPendingDuringSessionRef.current;

        // Gate on fromPendingFlow only — justActivated is always true on first render
        // (prevWasActiveRef starts as false), causing false triggers on page refresh.
        if (isNowActive && fromPendingFlow) {
            // Signature = subscription ID only (stable across billing cycles).
            // Using next_billing_date caused false triggers after each renewal.
            const signature = realSub?.id ?? 'sub-unknown';
            const lastShown = localStorage.getItem(SUCCESS_SHOWN_KEY);

            if (lastShown !== signature) {
                const planLabel = plans.find((p) => p.plan_id === realSub?.plan_id)?.displayName
                    || plans.find((p) => p.plan_id === realSub?.plan_id)?.name
                    || TIER_META[features?.subscription.tier ?? 'free']?.label
                    || 'Premium';

                const providerLabel = realSub?.provider === 'telegram_stars'
                    ? t('payment_method_stars', 'Telegram Stars')
                    : realSub?.provider === 'telegram_card'
                        ? t('payment_method_card', 'Credit Card')
                        : t('payment_method_paypal', 'PayPal');

                setSuccessPayload({
                    kind: pendingSuccessKindRef.current,
                    planName: planLabel,
                    provider: providerLabel,
                    amount: typeof realSub?.amount === 'number' ? realSub.amount : null,
                    currency: realSub?.currency ?? 'USD',
                    nextRenewal: realSub?.next_billing_date
                        ? new Date(realSub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : null,
                    autoRenew: !realSub?.cancel_at_period_end,
                    invoiceId: realSub?.id ?? '—',
                    timeRemaining: t('time_remaining_short', 'Active'),
                    unlockedFeatures: [
                        t('subscription_active_desc', 'All premium features are enabled.'),
                    ],
                    signature,
                });
                setShowPremiumSuccess(true);
                localStorage.setItem(SUCCESS_SHOWN_KEY, signature);
            }

            hadPendingDuringSessionRef.current = false;
        }

        prevWasActiveRef.current = isNowActive;
    }, [
        realStatus,
        isPremium,
        realSub?.id,
        realSub?.status,
        realSub?.next_billing_date,
        realSub?.plan_id,
        realSub?.provider,
        realSub?.amount,
        realSub?.currency,
        realSub?.cancel_at_period_end,
        plans,
        features?.subscription.tier,
        t,
    ]);

    // ── Build PayPal redirect URLs ────────────────
    // Route to /paypal-return — a standalone page that doesn't need Telegram auth.
    // The mini app picks up the pending subscription via localStorage on next open.
    const buildUrls = useCallback(() => {
        const base = window.location.origin;
        return {
            return_url: `${base}/paypal-return`,
            cancel_url: `${base}/paypal-return?cancelled=true`,
        };
    }, []);

    // ── Handlers ──────────────────────────────────
    const handleCancelChange = useCallback(() => {
        setModal({
            title: t('cancel_change'),
            message: t('cancel_change_confirm'),
            confirmLabel: t('yes_cancel'),
            confirmColor: '#ef4444',
            action: async () => {
                try {
                    await cancelChange();
                    showToast(t('change_cancelled'), 'success');
                } catch (e: any) {
                    showToast(e.message || 'Error', 'error');
                }
            },
        });
    }, [cancelChange, showToast, t]);

    const handleAutoRenewToggle = useCallback(() => {
        if (!features) return;
        const newVal = !features.subscription.auto_renew;

        if (!newVal) {
            setModal({
                title: t('disable_autorenew'),
                message: t('disable_autorenew_message'),
                confirmLabel: t('disable'),
                confirmColor: '#ef4444',
                action: async () => {
                    try {
                        await toggleAutoRenew(false);
                        showToast(t('autorenew_disabled'), 'info');
                    } catch (e: any) {
                        showToast(e.message || 'Error', 'error');
                    }
                },
            });
        } else {
            toggleAutoRenew(true)
                .then(() => showToast(t('autorenew_enabled'), 'success'))
                .catch((e) => showToast(e.message || 'Error', 'error'));
        }
    }, [features, toggleAutoRenew, showToast, t]);

    // ── Handlers (real PayPal) ────────────────────
    const handleRealCheckout = useCallback(async (planId: string, startTime?: string) => {
        try {
            const { return_url, cancel_url } = buildUrls();
            const approvalUrl = await checkout(planId, return_url, cancel_url, startTime);
            haptic?.notificationOccurred('success');
            showToast(t('paypal_opening', 'Opening PayPal... Complete payment in your browser.'), 'info');
            webApp?.openLink(approvalUrl);
        } catch (e: any) {
            haptic?.notificationOccurred('error');
            showToast(e.message || t('checkout_error', 'Failed to start checkout'), 'error');
        }
    }, [checkout, buildUrls, webApp, haptic, showToast, t]);

    const handleRealRevise = useCallback(async (subscriptionId: string, newPlanId: string, isUpgrade: boolean): Promise<{
        ok: boolean;
        approvalUrl: string;
        reason?: 'pending_confirmation' | 'error';
        message?: string;
    }> => {
        pendingSuccessKindRef.current = isUpgrade ? 'upgrade_success' : 'welcome_back';
        try {
            const { return_url, cancel_url } = buildUrls();
            const result = await revise(subscriptionId, newPlanId, return_url, cancel_url);
            if (result.approvalUrl) {
                haptic?.notificationOccurred('success');
                return { ok: true, approvalUrl: result.approvalUrl };
            } else {
                // No approval needed (immediate revision)
                showToast(t('plan_changed', 'Plan changed successfully!'), 'success');
                haptic?.notificationOccurred('success');
                loadRealStatus();
                load();
                return { ok: true, approvalUrl: '' };
            }
        } catch (e: any) {
            haptic?.notificationOccurred('error');
            showToast(e.message || t('revise_error', 'Failed to change plan'), 'error');
            return { ok: false, approvalUrl: '', message: e.message };
        }
    }, [revise, buildUrls, haptic, showToast, t, loadRealStatus, load]);

    const handleCancelReal = useCallback(() => {
        setModal({
            title: t('cancel_subscription_confirm_title', 'Cancel subscription?'),
            message: t('cancel_subscription_confirm_message', `Your premium access will remain active until ${realSub?.next_billing_date ? new Date(realSub.next_billing_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of your billing period'}. No further charges will be made.`),
            confirmLabel: t('yes_cancel_subscription', 'Yes, cancel'),
            confirmColor: '#ef4444',
            action: async () => {
                if (!realSub?.id) return;
                try {
                    await cancelReal(realSub.id);
                    showToast(t('subscription_cancelled', 'Subscription cancelled. Access continues until period end.'), 'success');
                    haptic?.notificationOccurred('success');
                    loadRealStatus();
                    load();
                } catch (e: any) {
                    showToast(e.message || 'Error', 'error');
                }
            },
        });
    }, [realSub, cancelReal, showToast, haptic, t, loadRealStatus, load]);

    const handleResubscribeSamePlan = useCallback(async () => {
        if (!realSub?.plan_id) return;
        // Pass start_time = next_billing_date so PayPal defers the first charge
        // until the current (already-paid) period ends — no double billing
        const startTime = realSub.next_billing_date
            ? new Date(realSub.next_billing_date).toISOString()
            : undefined;
        await handleRealCheckout(realSub.plan_id, startTime);
    }, [realSub, handleRealCheckout]);

    const handleResume = useCallback(async () => {
        if (!realSub?.id) return;
        pendingSuccessKindRef.current = 'welcome_back';
        try {
            await resume(realSub.id);
            showToast(t('subscription_resumed', 'Subscription resumed!'), 'success');
            haptic?.notificationOccurred('success');
            loadRealStatus();
            load();
        } catch (e: any) {
            showToast(e.message || 'Error', 'error');
        }
    }, [realSub, resume, showToast, haptic, t, loadRealStatus, load]);

    const handleCancelDowngrade = useCallback(() => {
        setModal({
            title: t('undo_downgrade_confirm_title', 'Keep current plan?'),
            message: t('undo_downgrade_confirm_message', 'Your plan will continue without changes. The scheduled downgrade will be removed.'),
            confirmLabel: t('yes_keep_plan', 'Yes, keep plan'),
            confirmColor: '#3b82f6',
            action: async () => {
                if (!realSub?.id) return;
                try {
                    const { return_url, cancel_url } = buildUrls();
                    const result = await cancelDowngrade(realSub.id, return_url, cancel_url);
                    if (result.approvalUrl) {
                        haptic?.notificationOccurred('success');
                        showToast(t('paypal_opening', 'Opening PayPal... Approve to keep your current plan.'), 'info');
                        webApp?.openLink(result.approvalUrl);
                    } else {
                        showToast(t('downgrade_cancelled_toast', 'Scheduled downgrade cancelled. Your plan stays the same.'), 'success');
                        haptic?.notificationOccurred('success');
                    }
                } catch (e: any) {
                    showToast(e.message || 'Error', 'error');
                }
            },
        });
    }, [realSub, cancelDowngrade, buildUrls, showToast, haptic, t, webApp]);

    const handleOpenPendingPaymentModal = useCallback(() => {
        if (!realSub?.approval_url) return;

        haptic?.impactOccurred('medium');

        localStorage.setItem(PENDING_SUB_KEY, realSub.id || 'paypal-waiting');
        localStorage.setItem(PENDING_METHOD_KEY, 'paypal');
        localStorage.setItem(PENDING_PAYPAL_URL_KEY, realSub.approval_url);
        if (realSub.plan_id) {
            localStorage.setItem(PENDING_PAYPAL_PLAN_KEY, realSub.plan_id);
        } else {
            localStorage.removeItem(PENDING_PAYPAL_PLAN_KEY);
        }
        localStorage.setItem(PENDING_PAYPAL_CREATED_AT_KEY, String(Date.now()));

        setOpenPendingPaymentModal(true);
        setPlansOpen(true);
    }, [haptic, realSub]);

    // ── Loading state ─────────────────────────────
    if ((loading && !features) || (realLoading && realStatus === 'FREE' && !features)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-tg-accent" />
                <span className="text-[13px] font-medium text-tg-hint animate-pulse">{t('common:loading', 'Loading...')}</span>
            </div>
        );
    }

    if (!features) return null;

    const { subscription } = features;
    const tier = subscription.tier;

    return (
        <div className="pb-32 animate-fade-in relative flex flex-col gap-5">
            <StickyHeader
                title={t('your_subscription', 'Subscription')}
                subtitle={t('current_plan', { plan: TIER_META[tier]?.label || 'Free' })}
                icon={
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                }
            />

            {/* ── Activation success banner ──────────────────────── */}
            {realStatus === 'ACTIVE' && !pendingSubscriptionId && isPremium && tier !== 'free' && (
                <div className="mx-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3.5 animate-slide-up backdrop-blur-sm">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0 mt-0.5">
                        <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-emerald-400 tracking-wide">
                            {t('subscription_active', 'Subscription Active')}
                        </p>
                        <p className="text-xs text-tg-hint/80 leading-relaxed">
                            {t('subscription_active_desc', 'All premium features are enabled.')}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Syncing banner (PayPal ACTIVE but local still free) ───── */}
            {realStatus === 'ACTIVE' && !pendingSubscriptionId && isPremium && tier === 'free' && (
                <div className="mx-5 rounded-[20px] overflow-hidden animate-slide-up" style={{ border: '1.5px solid rgba(139,92,246,0.2)' }}>
                    {/* Top gradient strip */}
                    <div
                        className="px-4 pt-4 pb-3"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(168,85,247,0.06) 100%)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
                            >
                                <Sparkles size={17} className="text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-bold text-violet-400 leading-tight">
                                    {t('plan_syncing', 'Activating your features…')}
                                </p>
                                <p className="text-[12px] text-tg-hint mt-0.5">
                                    {t('plan_syncing_desc', 'Features will be ready in a few seconds.')}
                                </p>
                            </div>
                            <Loader2 size={16} className="animate-spin text-violet-400 flex-shrink-0" />
                        </div>
                    </div>
                    {/* Refresh button */}
                    <button
                        onClick={() => { haptic?.impactOccurred('light'); load(); loadRealStatus(); }}
                        className="w-full py-2.5 text-[13px] font-semibold text-violet-400 flex items-center justify-center gap-1.5 active:brightness-75 transition-all"
                        style={{ background: 'rgba(139,92,246,0.06)', borderTop: '1px solid rgba(139,92,246,0.12)' }}
                    >
                        <Clock size={12} className="opacity-70" />
                        {t('tap_to_refresh', 'Tap to refresh')}
                    </button>
                </div>
            )}

            {/* ── 1. Hero ──────────────────────────────────────────── */}
            <SubscriptionHero features={features} realStatus={realStatus} realSub={realSub} plans={plans} />


            {/* OPEN APPROVAL URL CALLACTION */}
            {
                realStatus === 'PENDING' && realSub && realSub.approval_url && (
                    <>
                        <div className="px-5">
                            <button
                                onClick={handleOpenPendingPaymentModal}
                                className="w-full py-4 rounded-[20px] text-white text-[16px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform duration-150"
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
                                }}
                            >
                                <Crown size={18} className="drop-shadow-sm" />
                                {t('complete_payment', 'Complete your payment')}
                                <ChevronRight size={17} className="opacity-80" />
                            </button>
                        </div>
                    </>

                )
            }


            {/* ── 1b. Billing Timeline (pending downgrade or cancel) ─ */}
            {(realSub?.scheduled_plan_id || realStatus === 'ACTIVE_CANCEL_SCHEDULED') && (
                <BillingTimeline
                    currentTier={tier}
                    realStatus={realStatus}
                    realSub={realSub}
                    plans={plans}
                />
            )}

            {/* ── 2. Upgrade / Change Plan CTA ────────────────────── */}
            <div className="px-5">
                {tier === 'free' ? (
                    /* Free → Upgrade CTA (prominent) */
                    <button
                        onClick={() => { haptic?.impactOccurred('medium'); setPlansOpen(true); }}
                        className="w-full py-4 rounded-[20px] text-white text-[16px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform duration-150"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
                        }}
                    >
                        <Crown size={18} className="drop-shadow-sm" />
                        {t('upgrade_now', 'Get Premium')}
                        <ChevronRight size={17} className="opacity-80" />
                    </button>
                ) : (

                    // if already sheduled to downgrade, hide the change plan button to avoid confusion (since changing plan would also remove the scheduled downgrade)
                    realSub?.scheduled_plan_id || realStatus === 'ACTIVE_CANCEL_SCHEDULED' ? null : (
                        <button
                            onClick={() => { haptic?.impactOccurred('light'); setPlansOpen(true); }}
                            className="w-full py-3.5 px-4 rounded-[20px] text-[15px] font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform duration-150"
                            style={{
                                background: `${TIER_META[tier]?.color ?? '#8b5cf6'}18`,
                                color: TIER_META[tier]?.color ?? '#8b5cf6',
                                border: `1.5px solid ${TIER_META[tier]?.color ?? '#8b5cf6'}30`,
                            }}
                        >
                            <ArrowUpCircle size={17} className="shrink-0" />
                            {t('change_plan', 'Change Plan')}
                            <ChevronRight size={15} className="opacity-60 ml-auto" />
                        </button>
                    )
                )}
            </div>

            {/* ── 3. Settings (auto-renew, cancel, resume) ────────── */}
            <div ref={settingsRef}>
                <SubscriptionSettings
                    features={features}
                    onAutoRenewToggle={handleAutoRenewToggle}
                    onCancelChange={handleCancelChange}
                    haptic={haptic}
                    realStatus={realStatus}
                    realSub={realSub}
                    onCancelReal={handleCancelReal}
                    onResume={handleResume}
                    onResubscribe={handleResubscribeSamePlan}
                    actionLoading={actionLoading}
                    plans={plans}
                    onCancelDowngrade={handleCancelDowngrade}
                />
            </div>

            {/* ── 4. Usage Limits ──────────────────────────────────── */}
            <SubscriptionUsage features={features} />

            {/* ── 5. Benefits Grid ─────────────────────────────────── */}
            <SubscriptionBenefits features={features} />

            {/* ── 6. "Compare Plans" secondary link ───────────────── */}
            <div className="px-5 pb-2">
                <button
                    onClick={() => { haptic?.impactOccurred('light'); setPlansOpen(true); }}
                    className="w-full py-3.5 rounded-[18px] text-[14px] font-semibold text-tg-hint flex items-center justify-center gap-2 active:text-tg-text transition-colors"
                    style={{ background: 'rgba(125,139,151,0.06)', border: '1px solid rgba(125,139,151,0.1)' }}
                >
                    <Sparkles size={15} className="opacity-70" />
                    {t('compare_plans', 'Compare all plans')}
                </button>
            </div>

            <p className="mx-6 mt-1 mb-2 text-center text-[12px] font-medium text-tg-hint leading-relaxed opacity-70">
                {t('upgrade_note', 'Payments processed securely by PayPal. Cancel anytime.')}
            </p>

            {/* ── Plans Bottom Sheet ───────────────────────────────── */}
            <PlansBottomSheet
                isOpen={plansOpen}
                onClose={() => setPlansOpen(false)}
                currentTier={tier}
                realStatus={realStatus}
                realSubscriptionId={realSub?.id ?? null}
                realPlans={plans}
                initialSelectedPlanId={realSub?.plan_id ?? null}
                openPaymentModalOnOpen={openPendingPaymentModal}
                onPaymentModalOpened={() => setOpenPendingPaymentModal(false)}
                onCheckout={handleRealCheckout}
                onPayPalCheckout={async (planId: string) => {
                    pendingSuccessKindRef.current = 'new_purchase';
                    try {
                        const { return_url, cancel_url } = buildUrls();
                        const approvalUrl = await checkout(planId, return_url, cancel_url);
                        return { ok: true, approvalUrl };
                    } catch (e: any) {
                        const msg = e?.error?.message || e?.message || 'Unable to start PayPal confirmation.';
                        const pending = /pending subscription|confirmaci[oó]n pendiente|already has a pending/i.test(String(msg));
                        return {
                            ok: false,
                            approvalUrl: '',
                            reason: pending ? 'pending_confirmation' as const : 'error' as const,
                            message: msg,
                        };
                    }
                }}
                onRevise={handleRealRevise}
                actionLoading={actionLoading}
                scheduledPlanId={realSub?.scheduled_plan_id ?? null}
            />

            {/* ── Confirm Modal ────────────────────────────────────── */}
            {modal && (
                <ConfirmModal
                    title={modal.title}
                    message={modal.message}
                    confirmLabel={modal.confirmLabel}
                    confirmColor={modal.confirmColor}
                    onConfirm={async () => {
                        await modal.action();
                        setModal(null);
                    }}
                    onCancel={() => setModal(null)}
                />
            )}

            <PremiumSuccessModal
                isOpen={showPremiumSuccess && successPayload !== null}
                kind={successPayload?.kind ?? 'new_purchase'}
                planName={successPayload?.planName ?? t('plan_pro', 'Pro')}
                provider={successPayload?.provider ?? t('payment_method_paypal', 'PayPal')}
                amount={successPayload?.amount ?? null}
                currency={successPayload?.currency ?? 'USD'}
                nextRenewal={successPayload?.nextRenewal ?? null}
                autoRenew={successPayload?.autoRenew ?? true}
                invoiceId={successPayload?.invoiceId ?? '—'}
                timeRemaining={successPayload?.timeRemaining ?? t('time_remaining_short', 'Active')}
                unlockedFeatures={successPayload?.unlockedFeatures ?? []}
                onViewSubscription={() => {
                    setShowPremiumSuccess(false);
                    settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onClose={() => setShowPremiumSuccess(false)}
            />
        </div>
    );
}