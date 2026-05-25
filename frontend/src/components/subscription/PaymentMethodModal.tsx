import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    X, Star, CreditCard, Check, Loader2, AlertTriangle, RefreshCw, CheckCircle2, Sparkles,
} from 'lucide-react';
import type { PayPalPlan } from '../../services/subscriptionApi';
import { createStarsInvoice, createCardInvoice } from '../../services/subscriptionApi';
import { useSubscriptionStore } from '../../stores/subscription';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: PayPalPlan | null;
    onPayPal: (planId: string) => Promise<{
        ok: boolean;
        approvalUrl: string;
        reason?: 'pending_confirmation' | 'error';
        message?: string;
    }>;
    onSuccess: () => void;
    /** When true, skips the idle method-selection screen and immediately starts PayPal (revise mode). */
    autoStartPayPal?: boolean;
}

type PaymentMethod = 'stars' | 'paypal' | 'card';
type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending' | 'unknown';
type PaymentFlowState =
    | 'idle'
    | 'opening_provider'
    | 'waiting_payment'
    | 'verifying_payment'
    | 'activating_subscription'
    | 'syncing_account'
    | 'success'
    | 'failed'
    | 'cancelled'
    | 'timeout'
    | 'retrying'
    | 'restoring_session';

const PENDING_SUB_KEY = 'trelk:pendingSubscription';
const PENDING_METHOD_KEY = 'trelk:pendingPaymentMethod';
const PENDING_PAYPAL_URL_KEY = 'trelk:pendingPaypalUrl';
const PENDING_PAYPAL_PLAN_KEY = 'trelk:pendingPaypalPlan';
const PENDING_PAYPAL_CREATED_AT_KEY = 'trelk:pendingPaypalCreatedAt';
const FLOW_TIMEOUT_MS = 120000; // 2 minutes, after this we consider the flow to be stalled and offer a retry (for PayPal, which can be slow sometimes)
const PENDING_PAYPAL_URL_MAX_AGE_MS = 1000 * 60 * 20;

const PROCESSING_STATES: PaymentFlowState[] = [
    'opening_provider',
    'waiting_payment',
    'verifying_payment',
    'activating_subscription',
    'syncing_account',
    'retrying',
    'restoring_session',
];

const TERMINAL_ERROR_STATES: PaymentFlowState[] = ['failed', 'cancelled', 'timeout'];

export default function PaymentMethodModal({
    isOpen,
    onClose,
    selectedPlan,
    onPayPal,
    onSuccess,
    autoStartPayPal = false,
}: Props) {
    const { t } = useTranslation('subscription');

    const [mounted, setMounted] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [method, setMethod] = useState<PaymentMethod>('stars');
    const [lastAttemptedMethod, setLastAttemptedMethod] = useState<PaymentMethod>('paypal');
    const [starsLoading, setStarsLoading] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [starsStatus, setStarsStatus] = useState<null | 'activating' | 'error'>(null);
    const [cardStatus, setCardStatus] = useState<null | 'activating' | 'error'>(null);
    const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | null>(null);
    const [flowState, setFlowState] = useState<PaymentFlowState>('idle');
    const [paypalPendingNotice, setPaypalPendingNotice] = useState<string | null>(null);
    const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const successHandledRef = useRef(false);
    const pendingPaypalAutoOpenedRef = useRef(false);
    const startPolling = useSubscriptionStore((s) => s.startPolling);
    const realStatus = useSubscriptionStore((s) => s.realStatus);
    const isPremium = useSubscriptionStore((s) => s.isPremium);

    const clearFlowTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    const clearPendingSession = useCallback(() => {
        localStorage.removeItem(PENDING_SUB_KEY);
        localStorage.removeItem(PENDING_METHOD_KEY);
        localStorage.removeItem(PENDING_PAYPAL_URL_KEY);
        localStorage.removeItem(PENDING_PAYPAL_PLAN_KEY);
        localStorage.removeItem(PENDING_PAYPAL_CREATED_AT_KEY);
    }, []);

    const getReusablePendingPaypalUrl = useCallback(() => {
        const pendingUrl = localStorage.getItem(PENDING_PAYPAL_URL_KEY);
        if (!pendingUrl || !selectedPlan) return null;

        const pendingPlan = localStorage.getItem(PENDING_PAYPAL_PLAN_KEY);
        const createdAt = Number(localStorage.getItem(PENDING_PAYPAL_CREATED_AT_KEY) ?? '0');
        const isFresh = Number.isFinite(createdAt) && createdAt > 0 && (Date.now() - createdAt) <= PENDING_PAYPAL_URL_MAX_AGE_MS;

        if (pendingPlan && pendingPlan !== selectedPlan.plan_id) {
            clearPendingSession();
            return null;
        }

        if (!isFresh) {
            clearPendingSession();
            return null;
        }

        return pendingUrl;
    }, [clearPendingSession, selectedPlan]);

    const queueFlowState = useCallback((nextState: PaymentFlowState, delayMs: number) => {
        const timer = setTimeout(() => {
            setFlowState((current) => (current === 'success' ? current : nextState));
        }, delayMs);
        timersRef.current.push(timer);
    }, []);

    const armTimeoutState = useCallback(() => {
        const timer = setTimeout(() => {
            setFlowState((current) => (
                current === 'success' || TERMINAL_ERROR_STATES.includes(current) ? current : 'timeout'
            ));
        }, FLOW_TIMEOUT_MS);
        timersRef.current.push(timer);
    }, []);

    const scheduleActivationFlow = useCallback((source: 'fresh' | 'restore') => {
        clearFlowTimers();
        if (source === 'restore') {
            setFlowState('restoring_session');
            queueFlowState('activating_subscription', 900);
            queueFlowState('syncing_account', 3000);
        } else {
            setFlowState('verifying_payment');
            queueFlowState('activating_subscription', 900);
            queueFlowState('syncing_account', 3000);
        }
        armTimeoutState();
    }, [armTimeoutState, clearFlowTimers, queueFlowState]);

    const resetFlowView = useCallback((removePending = false) => {
        clearFlowTimers();
        successHandledRef.current = false;
        setPaypalPendingNotice(null);
        setFlowState('idle');
        setStarsLoading(false);
        setCardLoading(false);
        setStarsStatus(null);
        setCardStatus(null);
        setInvoiceStatus(null);
        if (removePending) {
            clearPendingSession();
        } else {
            localStorage.removeItem(PENDING_METHOD_KEY);
        }
    }, [clearFlowTimers, clearPendingSession]);

    const openExternalLink = useCallback((url: string) => {
        const webApp = (window as any).Telegram?.WebApp;
        if (webApp?.openLink) {
            webApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            clearFlowTimers();
            successHandledRef.current = false;

            const pendingSub = localStorage.getItem(PENDING_SUB_KEY);
            const pendingMethod = localStorage.getItem(PENDING_METHOD_KEY) as PaymentMethod | null;
            const pendingPaypalUrl = getReusablePendingPaypalUrl();
            const defaultMethod: PaymentMethod = selectedPlan?.stars_price ? 'stars' : 'paypal';

            // Si hay un URL de PayPal pendiente, reabrirlo automáticamente
            if (pendingPaypalUrl && pendingMethod === 'paypal') {
                setMethod('paypal');
                setLastAttemptedMethod('paypal');
                setFlowState('waiting_payment');
                setPaypalPendingNotice(t('paypal_pending_resume_hint', 'You already have a PayPal confirmation pending. Tap the button below to continue.'));
                localStorage.setItem(PENDING_SUB_KEY, 'paypal-waiting');
                startPolling('paypal-waiting');
                armTimeoutState();

                if (!pendingPaypalAutoOpenedRef.current) {
                    pendingPaypalAutoOpenedRef.current = true;
                    openExternalLink(pendingPaypalUrl);
                }

                setMounted(true);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setAnimateIn(true));
                });
            } else if (pendingSub && (pendingMethod === 'card' || pendingMethod === 'stars')) {
                setMethod(pendingMethod!);
                setLastAttemptedMethod(pendingMethod!);
                setStarsStatus(pendingMethod === 'stars' ? 'activating' : null);
                setCardStatus(pendingMethod === 'card' ? 'activating' : null);
                setInvoiceStatus(null);
                setStarsLoading(false);
                setCardLoading(false);
                scheduleActivationFlow('restore');
                startPolling(pendingSub);
                
                setMounted(true);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setAnimateIn(true));
                });
            } else {
                setMethod(defaultMethod);
                setLastAttemptedMethod(defaultMethod);
                setPaypalPendingNotice(null);
                setStarsStatus(null);
                setCardStatus(null);
                setInvoiceStatus(null);
                setStarsLoading(false);
                setCardLoading(false);
                setFlowState('idle');
                
                setMounted(true);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setAnimateIn(true));
                });
            }
        } else {
            clearFlowTimers();
            pendingPaypalAutoOpenedRef.current = false;
            setAnimateIn(false);
            const timer = setTimeout(() => {
                setMounted(false);
            }, 300);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [clearFlowTimers, isOpen, scheduleActivationFlow, selectedPlan?.stars_price, startPolling, armTimeoutState, t, getReusablePendingPaypalUrl, openExternalLink]);

    useEffect(() => {
        return () => {
            clearFlowTimers();
        };
    }, [clearFlowTimers]);

    const currentFlowMethod = flowState === 'idle' ? method : lastAttemptedMethod;
    const providerLabel = currentFlowMethod === 'stars'
        ? t('payment_method_stars', 'Telegram Stars')
        : currentFlowMethod === 'card'
            ? t('payment_method_card', 'Credit Card')
            : t('payment_method_paypal', 'PayPal');

    const providerTheme = currentFlowMethod === 'stars'
        ? {
            accent: '#facc15',
            accentSoft: 'rgba(250,204,21,0.16)',
            accentBorder: 'rgba(250,204,21,0.24)',
            accentText: '#facc15',
            glow: 'radial-gradient(circle at top left, rgba(250,204,21,0.18), transparent 58%)',
        }
        : currentFlowMethod === 'card'
            ? {
                accent: '#22c55e',
                accentSoft: 'rgba(34,197,94,0.16)',
                accentBorder: 'rgba(34,197,94,0.22)',
                accentText: '#86efac',
                glow: 'radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 58%)',
            }
            : {
                accent: '#3b82f6',
                accentSoft: 'rgba(59,130,246,0.16)',
                accentBorder: 'rgba(59,130,246,0.22)',
                accentText: '#93c5fd',
                glow: 'radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 58%)',
            };

    const isLockedState = PROCESSING_STATES.includes(flowState) || starsLoading || cardLoading;
    const showFlowView = flowState !== 'idle';

    const handleClose = useCallback(() => {
        setAnimateIn(false);
        setTimeout(onClose, 300);
    }, [onClose]);

    const pollActivation = useCallback((isCard = false, source: 'fresh' | 'restore' = 'fresh') => {
        localStorage.setItem(PENDING_SUB_KEY, 'telegram-payment');
        localStorage.setItem(PENDING_METHOD_KEY, isCard ? 'card' : 'stars');
        startPolling('telegram-payment');
        if (isCard) {
            setCardStatus('activating');
        } else {
            setStarsStatus('activating');
        }
        scheduleActivationFlow(source);
    }, [scheduleActivationFlow, startPolling]);

    const completeSuccess = useCallback(() => {
        if (successHandledRef.current) return;
        successHandledRef.current = true;
        clearFlowTimers();
        clearPendingSession();
        setStarsStatus(null);
        setCardStatus(null);
        setFlowState('success');
        const timer = setTimeout(() => {
            onSuccess();
        }, 240);
        timersRef.current.push(timer);
    }, [clearFlowTimers, clearPendingSession, onSuccess]);

    useEffect(() => {
        const isActivatingTelegram = starsStatus === 'activating' || cardStatus === 'activating';
        const isAwaitingPayPal =
            lastAttemptedMethod === 'paypal'
            && (flowState === 'opening_provider'
                || flowState === 'waiting_payment'
                || flowState === 'verifying_payment'
                || flowState === 'activating_subscription'
                || flowState === 'syncing_account'
                || flowState === 'retrying'
                || flowState === 'restoring_session'
                || flowState === 'timeout');

        if (!(isActivatingTelegram || isAwaitingPayPal)) return;
        if (realStatus === 'ACTIVE' || isPremium) {
            completeSuccess();
        }
    }, [
        starsStatus,
        cardStatus,
        lastAttemptedMethod,
        flowState,
        realStatus,
        isPremium,
        completeSuccess,
    ]);

    useEffect(() => {
        if (starsStatus === 'error' || cardStatus === 'error') {
            clearFlowTimers();
            setFlowState('failed');
        }
    }, [cardStatus, clearFlowTimers, starsStatus]);

    useEffect(() => {
        if (!invoiceStatus) return;
        clearFlowTimers();
        if (invoiceStatus === 'cancelled') {
            setFlowState('cancelled');
            return;
        }
        if (invoiceStatus === 'failed') {
            setFlowState('failed');
            return;
        }
        if (invoiceStatus === 'pending') {
            setFlowState('waiting_payment');
            armTimeoutState();
            return;
        }
        if (invoiceStatus === 'unknown') {
            setFlowState('timeout');
        }
    }, [armTimeoutState, clearFlowTimers, invoiceStatus]);

    const beginPayPalFlow = useCallback(async () => {
        if (!selectedPlan) return;
        setLastAttemptedMethod('paypal');
        setPaypalPendingNotice(null);
        clearFlowTimers();
        setFlowState('opening_provider');

        const openPendingApprovalUrl = () => {
            const pendingUrl = getReusablePendingPaypalUrl();
            if (!pendingUrl) return false;

            localStorage.setItem(PENDING_SUB_KEY, 'paypal-waiting');
            localStorage.setItem(PENDING_METHOD_KEY, 'paypal');
            localStorage.setItem(PENDING_PAYPAL_PLAN_KEY, selectedPlan.plan_id);
            localStorage.setItem(PENDING_PAYPAL_CREATED_AT_KEY, String(Date.now()));
            setFlowState('waiting_payment');
            setPaypalPendingNotice(t('paypal_pending_resume_hint', 'You already have a PayPal confirmation pending. Tap the button below to continue.'));
            armTimeoutState();
            openExternalLink(pendingUrl);

            startPolling('paypal-waiting');
            return true;
        };

        // Reusar URL pendiente antes de crear una nueva suscripción.
        if (openPendingApprovalUrl()) {
            return;
        }
        
        try {
            // Obtener approvalUrl del backend
            const result = await onPayPal(selectedPlan.plan_id);
            
            if (!result.ok || !result.approvalUrl) {
                const isPending = result.reason === 'pending_confirmation'
                    || /pending subscription|confirmaci[oó]n pendiente|already has a pending/i.test(result.message ?? '');

                if (isPending) {
                    setPaypalPendingNotice(result.message || t('paypal_pending_resume_hint', 'You already have a PayPal confirmation pending. Tap the button below to continue.'));
                    if (openPendingApprovalUrl()) {
                        return;
                    }

                    // Sin URL disponible todavía: mantener estado visual de espera para que el usuario no pierda el proceso.
                    setFlowState('waiting_payment');
                    localStorage.setItem(PENDING_SUB_KEY, 'paypal-waiting');
                    localStorage.setItem(PENDING_METHOD_KEY, 'paypal');
                    localStorage.setItem(PENDING_PAYPAL_PLAN_KEY, selectedPlan.plan_id);
                    localStorage.setItem(PENDING_PAYPAL_CREATED_AT_KEY, String(Date.now()));
                    startPolling('paypal-waiting');
                    armTimeoutState();
                    return;
                }

                setFlowState('failed');
                return;
            }
            
            // Guardar el URL para recuperarlo si el usuario cierra la página
            localStorage.setItem(PENDING_PAYPAL_URL_KEY, result.approvalUrl);
            localStorage.setItem(PENDING_PAYPAL_PLAN_KEY, selectedPlan.plan_id);
            localStorage.setItem(PENDING_PAYPAL_CREATED_AT_KEY, String(Date.now()));
            localStorage.setItem(PENDING_SUB_KEY, 'paypal-waiting');
            localStorage.setItem(PENDING_METHOD_KEY, 'paypal');
            
            // Transicionar a "waiting_payment" y abrir PayPal
            queueFlowState('waiting_payment', 220);
            armTimeoutState();
            
            // Abrir PayPal en nueva ventana (NO cerrar la modal)
            openExternalLink(result.approvalUrl);
            
            // Iniciar polling para detectar cuando se complete el pago
            startPolling('paypal-waiting');
        } catch (e) {
            console.error('PayPal flow error:', e);
            setFlowState('failed');
        }
    }, [selectedPlan, clearFlowTimers, queueFlowState, armTimeoutState, onPayPal, startPolling, t, getReusablePendingPaypalUrl, openExternalLink]);

    // Auto-start PayPal flow when opened in revise mode (skip idle screen)
    useEffect(() => {
        if (autoStartPayPal && flowState === 'idle' && mounted && isOpen) {
            beginPayPalFlow();
        }
    }, [autoStartPayPal, flowState, mounted, isOpen, beginPayPalFlow]);

    const handleStarsPay = useCallback(async () => {
        if (!selectedPlan || starsLoading) return;
        setLastAttemptedMethod('stars');
        setStarsLoading(true);
        setStarsStatus(null);
        setCardStatus(null);
        setInvoiceStatus(null);
        clearFlowTimers();
        setFlowState('opening_provider');

        try {
            const { invoiceUrl } = await createStarsInvoice(selectedPlan.name);
            const tgWebApp = (window as any).Telegram?.WebApp;

            if (!tgWebApp?.openInvoice) {
                window.open(invoiceUrl, '_blank');
                setStarsLoading(false);
                setFlowState('waiting_payment');
                armTimeoutState();
                return;
            }

            localStorage.setItem(PENDING_SUB_KEY, 'telegram-payment');
            localStorage.setItem(PENDING_METHOD_KEY, 'stars');
            setFlowState('waiting_payment');
            armTimeoutState();

            tgWebApp.openInvoice(invoiceUrl, (status: string) => {
                const normalized = String(status || '').toLowerCase() as InvoiceStatus;
                if (normalized === 'paid') {
                    setStarsLoading(false);
                    pollActivation(false, 'fresh');
                } else {
                    setInvoiceStatus(
                        normalized === 'cancelled' || normalized === 'failed' || normalized === 'pending'
                            ? normalized
                            : 'unknown',
                    );
                    if (normalized === 'cancelled' || normalized === 'failed') {
                        localStorage.removeItem(PENDING_SUB_KEY);
                        localStorage.removeItem(PENDING_METHOD_KEY);
                    }
                    setStarsLoading(false);
                }
            });
        } catch {
            localStorage.removeItem(PENDING_SUB_KEY);
            localStorage.removeItem(PENDING_METHOD_KEY);
            setStarsLoading(false);
            setStarsStatus('error');
        }
    }, [armTimeoutState, clearFlowTimers, pollActivation, selectedPlan, starsLoading]);

    const handleCardPay = useCallback(async () => {
        if (!selectedPlan || cardLoading) return;
        setLastAttemptedMethod('card');
        setCardLoading(true);
        setStarsStatus(null);
        setCardStatus(null);
        setInvoiceStatus(null);
        clearFlowTimers();
        setFlowState('opening_provider');

        try {
            const { invoiceUrl } = await createCardInvoice(selectedPlan.name, 'USD');
            const tgWebApp = (window as any).Telegram?.WebApp;

            if (!tgWebApp?.openInvoice) {
                window.open(invoiceUrl, '_blank');
                setCardLoading(false);
                setFlowState('waiting_payment');
                armTimeoutState();
                return;
            }

            localStorage.setItem(PENDING_SUB_KEY, 'telegram-payment');
            localStorage.setItem(PENDING_METHOD_KEY, 'card');
            setFlowState('waiting_payment');
            armTimeoutState();

            tgWebApp.openInvoice(invoiceUrl, (status: string) => {
                const normalized = String(status || '').toLowerCase() as InvoiceStatus;
                if (normalized === 'paid') {
                    setCardLoading(false);
                    pollActivation(true, 'fresh');
                } else {
                    setInvoiceStatus(
                        normalized === 'cancelled' || normalized === 'failed' || normalized === 'pending'
                            ? normalized
                            : 'unknown',
                    );
                    if (normalized === 'cancelled' || normalized === 'failed') {
                        localStorage.removeItem(PENDING_SUB_KEY);
                        localStorage.removeItem(PENDING_METHOD_KEY);
                    }
                    setCardLoading(false);
                }
            });
        } catch {
            localStorage.removeItem(PENDING_SUB_KEY);
            localStorage.removeItem(PENDING_METHOD_KEY);
            setCardLoading(false);
            setCardStatus('error');
        }
    }, [armTimeoutState, cardLoading, clearFlowTimers, pollActivation, selectedPlan]);

    const handleCTA = useCallback(() => {
        if (method === 'stars') {
            handleStarsPay();
        } else if (method === 'card') {
            handleCardPay();
        } else {
            beginPayPalFlow();
        }
    }, [beginPayPalFlow, handleCardPay, handleStarsPay, method]);

    const handleRetry = useCallback(() => {
        clearPendingSession();
        setInvoiceStatus(null);
        setStarsStatus(null);
        setCardStatus(null);
        setStarsLoading(false);
        setCardLoading(false);
        clearFlowTimers();
        setFlowState('retrying');

        const timer = setTimeout(() => {
            if (lastAttemptedMethod === 'stars') {
                handleStarsPay();
            } else if (lastAttemptedMethod === 'card') {
                handleCardPay();
            } else {
                beginPayPalFlow();
            }
        }, 260);
        timersRef.current.push(timer);
    }, [beginPayPalFlow, clearFlowTimers, clearPendingSession, handleCardPay, handleStarsPay, lastAttemptedMethod]);

    const handleBackToMethods = useCallback(() => {
        resetFlowView(flowState === 'cancelled' || flowState === 'failed');
    }, [flowState, resetFlowView]);

    if (!mounted || !selectedPlan) return null;

    const hasStars = !!selectedPlan.stars_price;
    const cardPriceUsd = selectedPlan.price;

    const flowTitle = t(`payment_flow_${flowState}_title`, {
        defaultValue: flowState === 'opening_provider'
            ? 'Opening secure checkout...'
            : flowState === 'waiting_payment'
                ? 'Waiting for payment confirmation'
                : flowState === 'verifying_payment'
                    ? 'Verifying your payment'
                    : flowState === 'activating_subscription'
                        ? 'Activating subscription'
                        : flowState === 'syncing_account'
                            ? 'Syncing your account'
                            : flowState === 'success'
                                ? 'Payment confirmed'
                                : flowState === 'failed'
                                    ? 'Payment failed'
                                    : flowState === 'cancelled'
                                        ? 'Payment cancelled'
                                        : flowState === 'timeout'
                                            ? 'Still waiting for confirmation'
                                            : flowState === 'retrying'
                                                ? 'Retrying checkout'
                                                : flowState === 'restoring_session'
                                                    ? 'Restoring your payment session'
                                                    : 'Choose payment method',
    });

    const flowSubtitle = t(`payment_flow_${flowState}_subtitle`, {
        provider: providerLabel,
        defaultValue: flowState === 'opening_provider'
            ? 'Preparing a secure checkout for {{provider}}.'
            : flowState === 'waiting_payment'
                ? 'Complete the payment in {{provider}} to continue.'
                : flowState === 'verifying_payment'
                    ? 'We are confirming your payment with the provider.'
                    : flowState === 'activating_subscription'
                        ? 'Your premium plan is being activated.'
                        : flowState === 'syncing_account'
                            ? 'Applying premium features to your account.'
                            : flowState === 'success'
                                ? 'Everything is ready. Updating your premium experience now.'
                                : flowState === 'failed'
                                    ? 'The provider could not complete your payment. Try again.'
                                    : flowState === 'cancelled'
                                        ? 'No charge was made. You can choose another method or retry.'
                                        : flowState === 'timeout'
                                            ? 'The confirmation is taking longer than expected. You can retry or wait a little more.'
                                            : flowState === 'retrying'
                                                ? 'Starting the secure checkout again.'
                                                : 'We found an unfinished payment and resumed it for you.',
    });

    const stepLabels = [
        t('payment_step_opening', 'Opening secure checkout'),
        t('payment_step_waiting', 'Waiting for payment approval'),
        t('payment_step_verifying', 'Verifying payment'),
        t('payment_step_activating', 'Activating premium features'),
        t('payment_step_syncing', 'Syncing your account'),
    ];

    const flowProgressIndex = flowState === 'opening_provider' || flowState === 'retrying'
        ? 0
        : flowState === 'waiting_payment'
            ? 1
            : flowState === 'verifying_payment'
                ? 2
                : flowState === 'activating_subscription' || flowState === 'restoring_session'
                    ? 3
                    : flowState === 'syncing_account' || flowState === 'success'
                        ? 4
                        : -1;

    const flowRippleIcon = (
        <div className="relative w-9 h-9 flex items-center justify-center">
            <span
                className="absolute inset-0 rounded-full blur-[3px]"
                style={{
                    background: `conic-gradient(from 0deg, ${providerTheme.accentSoft}, transparent 42%, ${providerTheme.accentSoft})`,
                    animation: 'spin 5.8s linear infinite',
                    opacity: 0.8,
                }}
            />
            <span
                className="absolute w-8 h-8 rounded-full"
                style={{
                    border: `1px solid ${providerTheme.accentBorder}`,
                    animation: 'ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
                    opacity: 0.9,
                }}
            />
            <span
                className="absolute w-8 h-8 rounded-full"
                style={{
                    border: `1px solid ${providerTheme.accentBorder}`,
                    animation: 'ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
                    animationDelay: '0.8s',
                    opacity: 0.68,
                }}
            />
            <span
                className="absolute w-8 h-8 rounded-full"
                style={{
                    border: `1px solid ${providerTheme.accentBorder}`,
                    animation: 'ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
                    animationDelay: '1.6s',
                    opacity: 0.5,
                }}
            />
            <span
                className="absolute w-3.5 h-3.5 rounded-full"
                style={{
                    background: `radial-gradient(circle at 35% 35%, #ffffffcc, ${providerTheme.accent} 62%)`,
                    boxShadow: `0 0 20px ${providerTheme.accentSoft}`,
                    animation: 'pulse 1.9s ease-in-out infinite',
                }}
            />
            <span
                className="absolute w-[3px] h-[3px] rounded-full"
                style={{
                    background: '#ffffffd9',
                    transform: 'translate(7px, -7px)',
                    boxShadow: `0 0 8px ${providerTheme.accentSoft}`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                }}
            />
        </div>
    );

    const flowIcon = flowState === 'failed' || flowState === 'cancelled'
        ? <AlertTriangle size={20} style={{ color: flowState === 'cancelled' ? '#f59e0b' : '#f87171' }} />
        : flowState === 'success'
            ? <CheckCircle2 size={22} style={{ color: '#34d399' }} />
            : flowState === 'timeout'
                ? flowRippleIcon
                : currentFlowMethod === 'stars'
                    ? <Star size={18} fill={providerTheme.accent} style={{ color: providerTheme.accent }} />
                    : currentFlowMethod === 'card'
                        ? <CreditCard size={18} style={{ color: providerTheme.accent }} />
                        : <Sparkles size={18} style={{ color: providerTheme.accent }} />;

    const content = (
        <div
            className="fixed inset-0 z-[9200] flex flex-col justify-end bg-black/70"
            style={{
                background: animateIn ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
                backdropFilter: animateIn ? 'blur(10px)' : 'blur(0px)',
                transition: 'all .28s cubic-bezier(.32,.72,0,1)',
            }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                className="bg-tg-bg max-h-[90dvh] w-full md:mx-auto md:w-[400px] lg:w-[450px] rounded-t-[26px] overflow-hidden flex flex-col"
                style={{
                    transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
                    boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
                    willChange: 'transform',
                }}
            >
                <div className="flex justify-center pt-2.5 pb-1.5">
                    <div className="w-11 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                </div>

                <div className="flex items-start justify-between px-5 pt-1 pb-4">
                    <div>
                        <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight" style={{ color: '#fff' }}>
                            {showFlowView ? flowTitle : t('choose_payment_method', 'Choose payment method')}
                        </h2>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>
                                {selectedPlan.displayName ?? selectedPlan.name}
                            </span>

                            <div
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{
                                    background: showFlowView ? providerTheme.accentSoft : 'rgba(255,255,255,0.06)',
                                    color: showFlowView ? providerTheme.accentText : 'rgba(255,255,255,0.62)',
                                    border: showFlowView
                                        ? `1px solid ${providerTheme.accentBorder}`
                                        : '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                {showFlowView ? providerLabel : `$${selectedPlan.price}/mo`}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            opacity: 1,
                        }}
                    >
                        <X size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
                    </button>
                </div>

                <div className="relative px-5 pb-6 min-h-[420px]">
                    <div
                        className={`transition-all duration-300 ${showFlowView ? 'opacity-0 pointer-events-none translate-y-2 absolute inset-x-5 top-0' : 'opacity-100 translate-y-0 relative'}`}
                    >
                        <div className="space-y-3">
                            {hasStars && (
                                <button
                                    onClick={() => setMethod('stars')}
                                    className="w-full relative overflow-hidden rounded-[20px] px-4 py-4 text-left transition-all duration-300 active:scale-[0.985]"
                                    style={{
                                        background:
                                            method === 'stars'
                                                ? 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(245,158,11,0.08) 100%)'
                                                : 'rgba(255,255,255,0.035)',
                                        border:
                                            method === 'stars'
                                                ? '1px solid rgba(250,204,21,0.22)'
                                                : '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: method === 'stars' ? '0 10px 30px rgba(250,204,21,0.12)' : 'none',
                                    }}
                                >
                                    {method === 'stars' && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(250,204,21,0.14), transparent 58%)' }} />
                                    )}

                                    <div className="relative flex items-center gap-3.5">
                                        <div
                                            className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                            style={{
                                                background: method === 'stars' ? 'rgba(250,204,21,0.14)' : 'rgba(255,255,255,0.05)',
                                                border: method === 'stars' ? '1px solid rgba(250,204,21,0.16)' : '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <Star size={19} fill={method === 'stars' ? '#facc15' : 'none'} style={{ color: method === 'stars' ? '#facc15' : 'rgba(255,255,255,0.45)' }} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[14px] font-semibold" style={{ color: method === 'stars' ? '#fff' : 'rgba(255,255,255,0.76)' }}>
                                                    {t('payment_method_stars', 'Telegram Stars')}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15' }}>
                                                    AUTO
                                                </span>
                                            </div>
                                            <span className="text-[12px]" style={{ color: method === 'stars' ? 'rgba(255,236,170,0.72)' : 'rgba(125,139,151,0.72)' }}>
                                                {t('stars_monthly_note', 'Auto-renews monthly · Cancel anytime')}
                                            </span>
                                        </div>

                                        <div className="text-right mr-1">
                                            <div className="text-[18px] font-bold leading-none" style={{ color: method === 'stars' ? '#facc15' : 'rgba(255,255,255,0.62)' }}>
                                                {selectedPlan.stars_price?.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] mt-1" style={{ color: method === 'stars' ? 'rgba(255,236,170,0.55)' : 'rgba(125,139,151,0.58)' }}>
                                                ⭐ /mo
                                            </div>
                                        </div>

                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: method === 'stars' ? '#facc15' : 'transparent', border: method === 'stars' ? '1.5px solid #facc15' : '1.5px solid rgba(255,255,255,0.16)' }}>
                                            {method === 'stars' && <Check size={10} strokeWidth={3} color="#000" />}
                                        </div>
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={() => setMethod('card')}
                                className="w-full relative overflow-hidden rounded-[20px] px-4 py-4 text-left transition-all duration-300 active:scale-[0.985]"
                                style={{
                                    background:
                                        method === 'card'
                                            ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(21,128,61,0.08) 100%)'
                                            : 'rgba(255,255,255,0.035)',
                                    border:
                                        method === 'card'
                                            ? '1px solid rgba(74,222,128,0.2)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                    boxShadow: method === 'card' ? '0 10px 30px rgba(34,197,94,0.12)' : 'none',
                                }}
                            >
                                {method === 'card' && (
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(74,222,128,0.14), transparent 58%)' }} />
                                )}

                                <div className="relative flex items-center gap-3.5">
                                    <div
                                        className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                        style={{
                                            background: method === 'card' ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.05)',
                                            border: method === 'card' ? '1px solid rgba(34,197,94,0.16)' : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <CreditCard size={19} style={{ color: method === 'card' ? '#22c55e' : 'rgba(255,255,255,0.45)' }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[14px] font-semibold" style={{ color: method === 'card' ? '#fff' : 'rgba(255,255,255,0.76)' }}>
                                                {t('payment_method_card', 'Credit Card')}
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                                                AUTO
                                            </span>
                                        </div>
                                        <span className="text-[12px]" style={{ color: method === 'card' ? 'rgba(187,247,208,0.72)' : 'rgba(125,139,151,0.72)' }}>
                                            {t('card_monthly_note', 'Auto-renews monthly · Cancel anytime')}
                                        </span>
                                    </div>

                                    <div className="text-right mr-1">
                                        <div className="text-[18px] font-bold leading-none" style={{ color: method === 'card' ? '#22c55e' : 'rgba(255,255,255,0.62)' }}>
                                            ${cardPriceUsd}
                                        </div>
                                        <div className="text-[10px] mt-1" style={{ color: method === 'card' ? 'rgba(187,247,208,0.55)' : 'rgba(125,139,151,0.58)' }}>
                                            USD /mo
                                        </div>
                                    </div>

                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: method === 'card' ? '#22c55e' : 'transparent', border: method === 'card' ? '1.5px solid #22c55e' : '1.5px solid rgba(255,255,255,0.16)' }}>
                                        {method === 'card' && <Check size={10} strokeWidth={3} color="#fff" />}
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setMethod('paypal')}
                                className="w-full relative overflow-hidden rounded-[20px] px-4 py-4 text-left transition-all duration-300 active:scale-[0.985]"
                                style={{
                                    background:
                                        method === 'paypal'
                                            ? 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.08) 100%)'
                                            : 'rgba(255,255,255,0.035)',
                                    border:
                                        method === 'paypal'
                                            ? '1px solid rgba(59,130,246,0.2)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                    boxShadow: method === 'paypal' ? '0 10px 30px rgba(37,99,235,0.12)' : 'none',
                                }}
                            >
                                {method === 'paypal' && (
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(59,130,246,0.14), transparent 58%)' }} />
                                )}

                                <div className="relative flex items-center gap-3.5">
                                    <div
                                        className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                        style={{
                                            background: method === 'paypal' ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.05)',
                                            border: method === 'paypal' ? '1px solid rgba(59,130,246,0.16)' : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <CreditCard size={19} style={{ color: method === 'paypal' ? '#60a5fa' : 'rgba(255,255,255,0.45)' }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[14px] font-semibold" style={{ color: method === 'paypal' ? '#fff' : 'rgba(255,255,255,0.76)' }}>
                                                {t('payment_method_paypal', 'PayPal')}
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                                                AUTO
                                            </span>
                                        </div>
                                        <span className="text-[12px]" style={{ color: method === 'paypal' ? 'rgba(180,210,255,0.72)' : 'rgba(125,139,151,0.72)' }}>
                                            {t('payment_method_paypal_desc', 'Billed monthly · Cancel anytime')}
                                        </span>
                                    </div>

                                    <div className="text-right mr-1">
                                        <div className="text-[18px] font-bold leading-none" style={{ color: method === 'paypal' ? '#60a5fa' : 'rgba(255,255,255,0.62)' }}>
                                            ${selectedPlan.price}
                                        </div>
                                        <div className="text-[10px] mt-1" style={{ color: method === 'paypal' ? 'rgba(180,210,255,0.55)' : 'rgba(125,139,151,0.58)' }}>
                                            /mo
                                        </div>
                                    </div>

                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: method === 'paypal' ? '#3b82f6' : 'transparent', border: method === 'paypal' ? '1.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.16)' }}>
                                        {method === 'paypal' && <Check size={10} strokeWidth={3} color="#fff" />}
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={handleCTA}
                                disabled={starsLoading || cardLoading}
                                className="w-full py-4 rounded-[20px] text-[15px] font-bold flex items-center justify-center gap-2.5 mt-1 transition-all duration-300 active:scale-[0.985]"
                                style={
                                    method === 'stars'
                                        ? {
                                            background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                                            color: '#000',
                                            boxShadow: '0 10px 30px rgba(250,204,21,0.28)',
                                            opacity: starsLoading ? 0.7 : 1,
                                        }
                                        : method === 'card'
                                            ? {
                                                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                                                color: '#fff',
                                                boxShadow: '0 10px 30px rgba(34,197,94,0.24)',
                                                opacity: cardLoading ? 0.7 : 1,
                                            }
                                            : {
                                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                                color: '#fff',
                                                boxShadow: '0 10px 30px rgba(37,99,235,0.24)',
                                            }
                                }
                            >
                                {starsLoading || cardLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : method === 'stars' ? (
                                    <>
                                        <Star size={17} fill="currentColor" strokeWidth={0} />
                                        {t('stars_pay_cta', { amount: selectedPlan.stars_price })}
                                    </>
                                ) : method === 'card' ? (
                                    <>
                                        <CreditCard size={17} />
                                        {t('card_pay_cta', {
                                            amount: cardPriceUsd,
                                            defaultValue: `Pay $${cardPriceUsd}`,
                                        })}
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={17} />
                                        {t('subscribe_cta', { price: selectedPlan.price })}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div
                        className={`transition-all duration-300 ${showFlowView ? 'opacity-100 translate-y-0 relative' : 'opacity-0 pointer-events-none translate-y-3 absolute inset-x-5 top-0'}`}
                    >
                        <div className="relative overflow-hidden rounded-[22px] border border-slate-500/20 bg-slate-900/35 min-h-[340px]">
                            <div className="absolute inset-0 pointer-events-none" style={{ background: providerTheme.glow }} />

                            <div className="relative p-4">
                                <div className="w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm" style={{ background: providerTheme.accentSoft, border: `1px solid ${providerTheme.accentBorder}` }}>
                                    {PROCESSING_STATES.includes(flowState) ? (
                                        flowRippleIcon
                                    ) : (
                                        flowIcon
                                    )}
                                </div>

                                <div className="mt-4">
                                    <h3 className="text-[20px] font-bold tracking-[-0.02em] text-white leading-tight">
                                        {flowTitle}
                                    </h3>
                                    <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
                                        {flowSubtitle}
                                    </p>
                                </div>

                                {!TERMINAL_ERROR_STATES.includes(flowState) && (
                                    <div className="mt-4 rounded-[18px] border border-slate-500/20 bg-slate-950/35 p-3.5">
                                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: providerTheme.accentText }}>
                                            <span>{providerLabel}</span>
                                            <span>{t('payment_flow_secure_label', 'Secure checkout')}</span>
                                        </div>

                                        <div className="mt-3 space-y-2.5">
                                            {stepLabels.map((label, index) => {
                                                const status = flowProgressIndex < 0
                                                    ? 'upcoming'
                                                    : index < flowProgressIndex
                                                        ? 'done'
                                                        : index === flowProgressIndex
                                                            ? 'current'
                                                            : 'upcoming';

                                                return (
                                                    <div key={label} className="flex items-center gap-3">
                                                        <div
                                                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                                                            style={{
                                                                background: status === 'done'
                                                                    ? providerTheme.accent
                                                                    : status === 'current'
                                                                        ? providerTheme.accentSoft
                                                                        : 'rgba(255,255,255,0.05)',
                                                                border: status === 'upcoming'
                                                                    ? '1px solid rgba(255,255,255,0.08)'
                                                                    : `1px solid ${status === 'done' ? providerTheme.accent : providerTheme.accentBorder}`,
                                                            }}
                                                        >
                                                            {status === 'done' ? (
                                                                <Check size={10} strokeWidth={3} color={currentFlowMethod === 'stars' ? '#000' : '#fff'} />
                                                            ) : status === 'current' ? (
                                                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: providerTheme.accent }} />
                                                            ) : null}
                                                        </div>
                                                        <span className="text-[12px] font-medium" style={{ color: status === 'upcoming' ? 'rgba(255,255,255,0.42)' : '#fff' }}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}


                                {currentFlowMethod === 'paypal' && paypalPendingNotice && (flowState === 'waiting_payment' || flowState === 'timeout') && (
                                    <div className="mt-3 space-y-2.5">
                                        <div className="rounded-[14px] px-3 py-2.5 text-[12px]" style={{
                                            background: 'rgba(59,130,246,0.10)',
                                            border: '1px solid rgba(59,130,246,0.24)',
                                            color: '#bfdbfe',
                                        }}>
                                            {paypalPendingNotice}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const pendingUrl = getReusablePendingPaypalUrl();
                                                if (!pendingUrl) return;
                                                openExternalLink(pendingUrl);
                                            }}
                                            className="w-full py-3 rounded-[16px] text-[13px] font-semibold text-[#bfdbfe] border border-blue-400/35 bg-blue-500/10 active:scale-[0.99] transition-transform"
                                        >
                                            {t('paypal_resume_cta', 'Open PayPal and complete confirmation')}
                                        </button>
                                    </div>
                                )}

                                {flowState === 'success' && (
                                    <div className="mt-4 rounded-[16px] border border-emerald-400/20 bg-emerald-400/8 px-3.5 py-3 text-[12px] text-emerald-200">
                                        {t('payment_flow_success_hint', 'Everything looks good. Preparing your premium welcome...')}
                                    </div>
                                )}

                                {TERMINAL_ERROR_STATES.includes(flowState) && (
                                    <div className="mt-4 space-y-2.5">
                                        <div
                                            className="rounded-[16px] px-3.5 py-3 text-[12px]"
                                            style={{
                                                background: flowState === 'cancelled' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)',
                                                border: flowState === 'cancelled' ? '1px solid rgba(245,158,11,0.20)' : '1px solid rgba(239,68,68,0.20)',
                                                color: flowState === 'cancelled' ? '#fbbf24' : '#fca5a5',
                                            }}
                                        >
                                            {flowState === 'cancelled'
                                                ? t('payment_flow_cancelled_hint', 'The provider closed the checkout before payment was completed.')
                                                : flowState === 'timeout'
                                                    ? t('payment_flow_timeout_hint', 'The provider or webhook is taking too long to respond.')
                                                    : t('payment_flow_failed_hint', 'Something interrupted the payment confirmation.')} 
                                        </div>

                                        <button
                                            onClick={handleRetry}
                                            className="w-full py-3.5 rounded-[18px] text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
                                            style={{
                                                background: `linear-gradient(135deg, ${providerTheme.accent} 0%, ${providerTheme.accent}cc 100%)`,
                                                color: currentFlowMethod === 'stars' ? '#000' : '#fff',
                                                boxShadow: `0 10px 30px ${providerTheme.accentSoft}`,
                                            }}
                                        >
                                            <RefreshCw size={15} />
                                            {t('payment_retry_cta', 'Try again')}
                                        </button>

                                        <button
                                            onClick={handleBackToMethods}
                                            className="w-full py-3 rounded-[16px] text-[13px] font-semibold text-white/70 border border-slate-500/35 bg-slate-700/10 active:scale-[0.99] transition-transform"
                                        >
                                            {t('payment_back_to_methods_cta', 'Choose another method')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
