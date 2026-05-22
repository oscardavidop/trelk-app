import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    X, Star, CreditCard, Check, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import type { PayPalPlan, RealSubStatus } from '../../services/subscriptionApi';
import { createStarsInvoice, createCardInvoice, fetchRealStatus } from '../../services/subscriptionApi';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: PayPalPlan | null;
    /** Called to initiate PayPal checkout for this plan */
    onPayPal: () => void;
    /** Called when Stars or Card payment has been confirmed & subscription is active */
    onSuccess: () => void;
}

type PaymentMethod = 'stars' | 'paypal' | 'card';
type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending' | 'unknown';

export default function PaymentMethodModal({
    isOpen,
    onClose,
    selectedPlan,
    onPayPal,
    onSuccess,
}: Props) {
    const { t } = useTranslation('subscription');

    const [mounted, setMounted] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [method, setMethod] = useState<PaymentMethod>('stars');
    const [starsLoading, setStarsLoading] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [starsStatus, setStarsStatus] = useState<null | 'activating' | 'error'>(null);
    const [cardStatus, setCardStatus] = useState<null | 'activating' | 'error'>(null);
    const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setMethod(selectedPlan?.stars_price ? 'stars' : 'paypal');
            setStarsStatus(null);
            setCardStatus(null);
            setInvoiceStatus(null);
            setStarsLoading(false);
            setCardLoading(false);
            setMounted(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const t = setTimeout(() => {
                setMounted(false);
            }, 300);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [isOpen, selectedPlan?.stars_price, onClose]);

    // Cleanup poll on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleClose = useCallback(() => {
        if (starsLoading || cardLoading) return; // don't close while paying
        setAnimateIn(false);
        setTimeout(onClose, 300);
    }, [onClose, starsLoading, cardLoading]);

    const pollActivation = useCallback((isCard = false) => {
        let attempts = 0;
        const MAX = 12; // 12 × 3s = 36s
        pollRef.current = setInterval(async () => {
            attempts++;
            try {
                const res = await fetchRealStatus();
                if ((res as any).status === 'ACTIVE' || (res as any).isPremium) {
                    clearInterval(pollRef.current!);
                    if (isCard) {
                        setCardStatus(null);
                    } else {
                        setStarsStatus(null);
                    }
                    onSuccess();
                    handleClose();
                    return;
                }
            } catch { /* ignore */ }
            if (attempts >= MAX) {
                clearInterval(pollRef.current!);
                if (isCard) {
                    setCardStatus('error');
                } else {
                    setStarsStatus('error');
                }
            }
        }, 3_000);
    }, [handleClose, onSuccess]);

    const handleStarsPay = useCallback(async () => {
        if (!selectedPlan || starsLoading) return;
        setStarsLoading(true);
        setStarsStatus(null);
        setInvoiceStatus(null);

        try {
            const { invoiceUrl } = await createStarsInvoice(selectedPlan.name);

            const tgWebApp = (window as any).Telegram?.WebApp;
            if (!tgWebApp?.openInvoice) {
                // Fallback: open in browser tab (dev/testing)
                window.open(invoiceUrl, '_blank');
                setStarsLoading(false);
                return;
            }

            tgWebApp.openInvoice(invoiceUrl, (status: string) => {
                const normalized = String(status || '').toLowerCase() as InvoiceStatus;
                if (normalized === 'paid') {
                    setStarsStatus('activating');
                    setStarsLoading(false);
                    pollActivation(false);
                } else {
                    setInvoiceStatus(
                        normalized === 'cancelled' || normalized === 'failed' || normalized === 'pending'
                            ? normalized
                            : 'unknown'
                    );
                    setStarsLoading(false);
                }
            });
        } catch {
            setStarsLoading(false);
            setStarsStatus('error');
        }
    }, [selectedPlan, starsLoading, pollActivation]);

    const handleCardPay = useCallback(async () => {
        if (!selectedPlan || cardLoading) return;
        setCardLoading(true);
        setCardStatus(null);
        setInvoiceStatus(null);

        try {
            const { invoiceUrl } = await createCardInvoice(selectedPlan.name, 'USD');

            const tgWebApp = (window as any).Telegram?.WebApp;
            if (!tgWebApp?.openInvoice) {
                // Fallback: open in browser tab (dev/testing)
                window.open(invoiceUrl, '_blank');
                setCardLoading(false);
                return;
            }

            tgWebApp.openInvoice(invoiceUrl, (status: string) => {
                const normalized = String(status || '').toLowerCase() as InvoiceStatus;
                if (normalized === 'paid') {
                    setCardStatus('activating');
                    setCardLoading(false);
                    pollActivation(true);
                } else {
                    setInvoiceStatus(
                        normalized === 'cancelled' || normalized === 'failed' || normalized === 'pending'
                            ? normalized
                            : 'unknown'
                    );
                    setCardLoading(false);
                }
            });
        } catch {
            setCardLoading(false);
            setCardStatus('error');
        }
    }, [selectedPlan, cardLoading, pollActivation]);

    const handleCTA = useCallback(() => {
        if (method === 'stars') {
            handleStarsPay();
        } else if (method === 'card') {
            handleCardPay();
        } else {
            onPayPal();
        }
    }, [method, handleStarsPay, handleCardPay, onPayPal]);

    if (!mounted || !selectedPlan) return null;

    const hasStars = !!selectedPlan.stars_price;
    const isActivating = starsStatus === 'activating' || cardStatus === 'activating';
    const isError = starsStatus === 'error' || cardStatus === 'error';
    const cardPriceUsd = selectedPlan.price;

    const invoiceStatusText = (() => {
        switch (invoiceStatus) {
            case 'failed':
                return t('invoice_status_failed', 'Payment failed. Please try again.');
            case 'cancelled':
                return t('invoice_status_cancelled', 'Payment cancelled.');
            case 'pending':
                return t('invoice_status_pending', 'Payment is pending confirmation.');
            case 'unknown':
                return t('invoice_status_unknown', 'Payment was not completed.');
            default:
                return null;
        }
    })();

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
                className='bg-tg-bg max-h-[90dvh] w-full md:mx-auto md:w-[400px] lg:w-[450px] rounded-t-[26px] overflow-hidden flex flex-col'
                style={{
                    transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
                    boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
                    willChange: 'transform',
                }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-2.5 pb-1.5">
                    <div
                        className="w-11 h-1 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.12)',
                        }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-1 pb-4">
                    <div>
                        <h2
                            className="text-[22px] font-bold tracking-[-0.02em] leading-tight"
                            style={{ color: '#fff' }}
                        >
                            {t('choose_payment_method', 'Choose payment method')}
                        </h2>

                        <div className="flex items-center gap-2 mt-1.5">
                            <span
                                className="text-[13px] font-medium"
                                style={{ color: 'rgba(255,255,255,0.72)' }}
                            >
                                {selectedPlan.displayName ?? selectedPlan.name}
                            </span>

                            <div
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.62)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                ${selectedPlan.price}/mo
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        <X size={16} style={{ color: 'rgba(255,255,255,0.65)' }} />
                    </button>
                </div>

                <div className="px-5 pb-6 space-y-3">
                    {/* ── Activating overlay ── */}
                    {isActivating && (
                        <div
                            className="w-full py-4 rounded-[18px] flex flex-col items-center justify-center gap-1.5"
                            style={{
                                background:
                                    'linear-gradient(180deg, rgba(250,204,21,0.12), rgba(250,204,21,0.06))',
                                border: '1px solid rgba(250,204,21,0.16)',
                            }}
                        >
                            <div
                                className="flex items-center gap-2 text-[14px] font-semibold"
                                style={{ color: '#facc15' }}
                            >
                                <Loader2 size={15} className="animate-spin" />
                                {t('payment_activating', 'Activating subscription…')}
                            </div>

                            <span
                                className="text-[11px]"
                                style={{ color: 'rgba(255,236,170,0.6)' }}
                            >
                                {t('payment_processing', 'This may take a few seconds')}
                            </span>
                        </div>
                    )}

                    {/* ── Error state ── */}
                    {isError && (
                        <div className="space-y-2">
                            <div
                                className="w-full py-3 rounded-[16px] text-[12px] flex items-center justify-center gap-2"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.16)',
                                    color: '#f87171',
                                }}
                            >
                                <AlertTriangle size={13} strokeWidth={2.5} />
                                {t(
                                    'payment_activation_error',
                                    'Could not confirm. Please refresh in a moment.'
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setStarsStatus(null);
                                    setCardStatus(null);
                                    setInvoiceStatus(null);
                                }}
                                className="w-full py-2.5 rounded-[15px] text-[13px] font-semibold flex items-center justify-center gap-2"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'rgba(255,255,255,0.7)',
                                }}
                            >
                                <RefreshCw size={13} strokeWidth={2.5} />
                                {t('back_to_plan', 'Back to plan')}
                            </button>
                        </div>
                    )}

                    {invoiceStatusText && !isActivating && !isError && (
                        <div
                            className="w-full py-3 rounded-[16px] text-[12px] flex items-center justify-center gap-2"
                            style={{
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                color: '#f59e0b',
                            }}
                        >
                            <AlertTriangle size={13} strokeWidth={2.5} />
                            {invoiceStatusText}
                        </div>
                    )}

                    {/* ── Payment cards ── */}
                    {!isActivating && !isError && (
                        <>
                            {/* Stars */}
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
                                        boxShadow:
                                            method === 'stars'
                                                ? '0 10px 30px rgba(250,204,21,0.12)'
                                                : 'none',
                                    }}
                                >
                                    {method === 'stars' && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                background:
                                                    'radial-gradient(circle at top left, rgba(250,204,21,0.14), transparent 58%)',
                                            }}
                                        />
                                    )}

                                    <div className="relative flex items-center gap-3.5">
                                        <div
                                            className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                            style={{
                                                background:
                                                    method === 'stars'
                                                        ? 'rgba(250,204,21,0.14)'
                                                        : 'rgba(255,255,255,0.05)',
                                                border:
                                                    method === 'stars'
                                                        ? '1px solid rgba(250,204,21,0.16)'
                                                        : '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <Star
                                                size={19}
                                                fill={method === 'stars' ? '#facc15' : 'none'}
                                                style={{
                                                    color:
                                                        method === 'stars'
                                                            ? '#facc15'
                                                            : 'rgba(255,255,255,0.45)',
                                                }}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className="text-[14px] font-semibold"
                                                    style={{
                                                        color:
                                                            method === 'stars'
                                                                ? '#fff'
                                                                : 'rgba(255,255,255,0.76)',
                                                    }}
                                                >
                                                    {t('payment_method_stars', 'Telegram Stars')}
                                                </span>

                                                <span
                                                    className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                                                    style={{
                                                        background: 'rgba(250,204,21,0.12)',
                                                        color: '#facc15',
                                                    }}
                                                >
                                                    AUTO
                                                </span>
                                            </div>

                                            <span
                                                className="text-[12px]"
                                                style={{
                                                    color:
                                                        method === 'stars'
                                                            ? 'rgba(255,236,170,0.72)'
                                                            : 'rgba(125,139,151,0.72)',
                                                }}
                                            >
                                                {t(
                                                    'stars_monthly_note',
                                                    'Auto-renews monthly · Cancel anytime'
                                                )}
                                            </span>
                                        </div>

                                        <div className="text-right mr-1">
                                            <div
                                                className="text-[18px] font-bold leading-none"
                                                style={{
                                                    color:
                                                        method === 'stars'
                                                            ? '#facc15'
                                                            : 'rgba(255,255,255,0.62)',
                                                }}
                                            >
                                                {selectedPlan.stars_price?.toLocaleString()}
                                            </div>

                                            <div
                                                className="text-[10px] mt-1"
                                                style={{
                                                    color:
                                                        method === 'stars'
                                                            ? 'rgba(255,236,170,0.55)'
                                                            : 'rgba(125,139,151,0.58)',
                                                }}
                                            >
                                                ⭐ /mo
                                            </div>
                                        </div>

                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                            style={{
                                                background:
                                                    method === 'stars' ? '#facc15' : 'transparent',
                                                border:
                                                    method === 'stars'
                                                        ? '1.5px solid #facc15'
                                                        : '1.5px solid rgba(255,255,255,0.16)',
                                            }}
                                        >
                                            {method === 'stars' && (
                                                <Check size={10} strokeWidth={3} color="#000" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* Credit Card */}
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
                                    boxShadow:
                                        method === 'card'
                                            ? '0 10px 30px rgba(34,197,94,0.12)'
                                            : 'none',
                                }}
                            >
                                {method === 'card' && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background:
                                                'radial-gradient(circle at top left, rgba(74,222,128,0.14), transparent 58%)',
                                        }}
                                    />
                                )}

                                <div className="relative flex items-center gap-3.5">
                                    <div
                                        className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                        style={{
                                            background:
                                                method === 'card'
                                                    ? 'rgba(34,197,94,0.14)'
                                                    : 'rgba(255,255,255,0.05)',
                                            border:
                                                method === 'card'
                                                    ? '1px solid rgba(34,197,94,0.16)'
                                                    : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <CreditCard
                                            size={19}
                                            style={{
                                                color:
                                                    method === 'card'
                                                        ? '#22c55e'
                                                        : 'rgba(255,255,255,0.45)',
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[14px] font-semibold"
                                                style={{
                                                    color:
                                                        method === 'card'
                                                            ? '#fff'
                                                            : 'rgba(255,255,255,0.76)',
                                                }}
                                            >
                                                {t('payment_method_card', 'Credit Card')}
                                            </span>

                                            <span
                                                className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: 'rgba(34,197,94,0.12)',
                                                    color: '#22c55e',
                                                }}
                                            >
                                                AUTO
                                            </span>
                                        </div>

                                        <span
                                            className="text-[12px]"
                                            style={{
                                                color:
                                                    method === 'card'
                                                        ? 'rgba(187,247,208,0.72)'
                                                        : 'rgba(125,139,151,0.72)',
                                            }}
                                        >
                                            {t(
                                                'card_monthly_note',
                                                'Auto-renews monthly · Cancel anytime'
                                            )}
                                        </span>
                                    </div>

                                    <div className="text-right mr-1">
                                        <div
                                            className="text-[18px] font-bold leading-none"
                                            style={{
                                                color:
                                                    method === 'card'
                                                        ? '#22c55e'
                                                        : 'rgba(255,255,255,0.62)',
                                            }}
                                        >
                                            ${cardPriceUsd}
                                        </div>

                                        <div
                                            className="text-[10px] mt-1"
                                            style={{
                                                color:
                                                    method === 'card'
                                                        ? 'rgba(187,247,208,0.55)'
                                                        : 'rgba(125,139,151,0.58)',
                                            }}
                                        >
                                            USD /mo
                                        </div>
                                    </div>

                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                        style={{
                                            background:
                                                method === 'card' ? '#22c55e' : 'transparent',
                                            border:
                                                method === 'card'
                                                    ? '1.5px solid #22c55e'
                                                    : '1.5px solid rgba(255,255,255,0.16)',
                                        }}
                                    >
                                        {method === 'card' && (
                                            <Check size={10} strokeWidth={3} color="#fff" />
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* PayPal */}
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
                                    boxShadow:
                                        method === 'paypal'
                                            ? '0 10px 30px rgba(37,99,235,0.12)'
                                            : 'none',
                                }}
                            >
                                {method === 'paypal' && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background:
                                                'radial-gradient(circle at top left, rgba(59,130,246,0.14), transparent 58%)',
                                        }}
                                    />
                                )}

                                <div className="relative flex items-center gap-3.5">
                                    <div
                                        className="w-11 h-11 rounded-[15px] flex items-center justify-center shrink-0"
                                        style={{
                                            background:
                                                method === 'paypal'
                                                    ? 'rgba(59,130,246,0.14)'
                                                    : 'rgba(255,255,255,0.05)',
                                            border:
                                                method === 'paypal'
                                                    ? '1px solid rgba(59,130,246,0.16)'
                                                    : '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <CreditCard
                                            size={19}
                                            style={{
                                                color:
                                                    method === 'paypal'
                                                        ? '#60a5fa'
                                                        : 'rgba(255,255,255,0.45)',
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[14px] font-semibold"
                                                style={{
                                                    color:
                                                        method === 'paypal'
                                                            ? '#fff'
                                                            : 'rgba(255,255,255,0.76)',
                                                }}
                                            >
                                                {t('payment_method_paypal', 'PayPal')}
                                            </span>

                                            <span
                                                className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: 'rgba(59,130,246,0.12)',
                                                    color: '#60a5fa',
                                                }}
                                            >
                                                AUTO
                                            </span>
                                        </div>

                                        <span
                                            className="text-[12px]"
                                            style={{
                                                color:
                                                    method === 'paypal'
                                                        ? 'rgba(180,210,255,0.72)'
                                                        : 'rgba(125,139,151,0.72)',
                                            }}
                                        >
                                            {t(
                                                'payment_method_paypal_desc',
                                                'Billed monthly · Cancel anytime'
                                            )}
                                        </span>
                                    </div>

                                    <div className="text-right mr-1">
                                        <div
                                            className="text-[18px] font-bold leading-none"
                                            style={{
                                                color:
                                                    method === 'paypal'
                                                        ? '#60a5fa'
                                                        : 'rgba(255,255,255,0.62)',
                                            }}
                                        >
                                            ${selectedPlan.price}
                                        </div>

                                        <div
                                            className="text-[10px] mt-1"
                                            style={{
                                                color:
                                                    method === 'paypal'
                                                        ? 'rgba(180,210,255,0.55)'
                                                        : 'rgba(125,139,151,0.58)',
                                            }}
                                        >
                                            /mo
                                        </div>
                                    </div>

                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                        style={{
                                            background:
                                                method === 'paypal' ? '#3b82f6' : 'transparent',
                                            border:
                                                method === 'paypal'
                                                    ? '1.5px solid #3b82f6'
                                                    : '1.5px solid rgba(255,255,255,0.16)',
                                        }}
                                    >
                                        {method === 'paypal' && (
                                            <Check size={10} strokeWidth={3} color="#fff" />
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* CTA */}
                            <button
                                onClick={handleCTA}
                                disabled={starsLoading || cardLoading}
                                className="w-full py-4 rounded-[20px] text-[15px] font-bold flex items-center justify-center gap-2.5 mt-1 transition-all duration-300 active:scale-[0.985]"
                                style={
                                    method === 'stars'
                                        ? {
                                            background:
                                                'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                                            color: '#000',
                                            boxShadow: '0 10px 30px rgba(250,204,21,0.28)',
                                            opacity: starsLoading ? 0.7 : 1,
                                        }
                                        : method === 'card'
                                            ? {
                                                background:
                                                    'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                                                color: '#fff',
                                                boxShadow: '0 10px 30px rgba(34,197,94,0.24)',
                                                opacity: cardLoading ? 0.7 : 1,
                                            }
                                            : {
                                                background:
                                                    'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                                color: '#fff',
                                                boxShadow: '0 10px 30px rgba(37,99,235,0.24)',
                                            }
                                }
                            >
                                {starsLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : cardLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : method === 'stars' ? (
                                    <>
                                        <Star size={17} fill="currentColor" strokeWidth={0} />
                                        {t('stars_pay_cta', {
                                            amount: selectedPlan.stars_price,
                                        })}
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
                                        {t('subscribe_cta', {
                                            price: selectedPlan.price,
                                        })}
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
