import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X } from 'lucide-react';
import { celebrateConfettiSubtle } from '../../lib/delight';

export type SuccessKind = 'new_purchase' | 'upgrade_success' | 'welcome_back' | 'renewal_success' | 'restored';

export interface SuccessExperiencePayload {
    kind: SuccessKind;
    planName: string;
    provider: string;
    amount: number | null;
    currency: string;
    nextRenewal: string | null;
    autoRenew: boolean;
    invoiceId: string;
    timeRemaining: string;
    unlockedFeatures: string[];
    signature: string;
}

interface PremiumSuccessModalProps {
    isOpen: boolean;
    kind: SuccessKind;
    planName: string;
    provider: string;
    amount: number | null;
    currency: string;
    nextRenewal: string | null;
    autoRenew: boolean;
    invoiceId: string;
    timeRemaining: string;
    unlockedFeatures: string[];
    onClose: () => void;
    onViewSubscription: () => void;
}

export default function PremiumSuccessModal({
    isOpen,
    kind,
    planName,
    provider,
    amount,
    currency,
    nextRenewal,
    autoRenew,
    invoiceId,
    timeRemaining,
    unlockedFeatures,
    onClose,
    onViewSubscription,
}: PremiumSuccessModalProps) {
    const { t } = useTranslation('subscription');
    const highlightFeatures = unlockedFeatures.slice(0, 2);

    useEffect(() => {
        if (!isOpen) return;
        celebrateConfettiSubtle();
        const t1 = setTimeout(() => celebrateConfettiSubtle(), 360);
        return () => {
            clearTimeout(t1);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/70 animate-fade-in"
            style={{
                backdropFilter: 'blur(10px)',
            }}
        >
            <div
                className="relative bg-tg-bg w-full md:mx-auto md:w-[400px] lg:w-[450px] max-h-[560px] min-h-[420px] rounded-t-[26px] overflow-hidden flex flex-col animate-slide-up"
                style={{
                    boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
                    willChange: 'transform',
                }}
            >
                <div className="flex justify-center pt-2.5 pb-1.5">
                    <div className="w-11 h-1 rounded-full bg-white/15" />
                </div>

                <div
                    className="absolute inset-x-0 top-0 h-28"
                    style={{
                        background: 'radial-gradient(85% 120% at 50% 0%, rgba(16,185,129,0.22), rgba(16,185,129,0))',
                    }}
                />

                <div className="absolute right-4 top-4 flex gap-1.5 pointer-events-none">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{
                                background: i % 2 === 0 ? '#34d399' : '#38bdf8',
                                opacity: 0.65,
                                animationDelay: `${i * 120}ms`,
                            }}
                        />
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full bg-tg-surface/60 border border-tg-border/35 text-tg-hint flex items-center justify-center active:scale-95 transition-transform"
                >
                    <X size={15} />
                </button>

                <div className="relative px-5 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto">
                    <div className="w-12 h-12 rounded-[14px] bg-emerald-500/12 border border-emerald-500/30 shadow-sm flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>

                    <h3 className="text-[24px] leading-tight font-extrabold text-tg-text tracking-[-0.02em]">
                        {t(`success_kind_${kind}_title`, 'Welcome to Premium')}
                    </h3>
                    <p className="text-[14px] text-tg-hint mt-1.5 leading-relaxed">
                        {t(`success_kind_${kind}_subtitle`, 'Your account has been upgraded instantly.')}
                    </p>

                    <div className="mt-3 flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-semibold text-emerald-300 uppercase">
                            {planName}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-tg-surface/60 border border-tg-border/35 text-[11px] font-semibold text-tg-hint">
                            {provider}
                        </span>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-tg-border/35 bg-tg-surface/40 p-3.5">
                        <div className="flex items-center justify-between text-[13px]">
                            <span className="text-tg-hint">{t('receipt_next_renewal', 'Next renewal')}</span>
                            <span className="text-tg-text font-semibold">{nextRenewal ?? '—'}</span>
                        </div>
                        {amount != null && (
                            <div className="mt-2 pt-2 border-t border-tg-border/25 flex items-center justify-between text-[13px]">
                                <span className="text-tg-hint">{t('receipt_amount', 'Amount')}</span>
                                <span className="text-emerald-400 font-semibold">{`${amount} ${currency}`}</span>
                            </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-tg-border/25 flex items-center justify-between text-[13px]">
                            <span className="text-tg-hint">{t('receipt_auto_renew', 'Auto renew')}</span>
                            <span className="text-tg-text font-semibold">{autoRenew ? t('common:yes', 'Yes') : t('common:no', 'No')}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-tg-border/25 flex items-center justify-between text-[13px]">
                            <span className="text-tg-hint">{t('receipt_invoice', 'Invoice')}</span>
                            <span className="text-tg-text font-semibold truncate max-w-[60%] text-right">{invoiceId}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-tg-border/25 flex items-center justify-between text-[13px]">
                            <span className="text-tg-hint">{t('receipt_time_remaining', 'Time remaining')}</span>
                            <span className="text-tg-text font-semibold">{timeRemaining}</span>
                        </div>
                    </div>

                    {highlightFeatures.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {highlightFeatures.map((f) => (
                                <span key={f} className="px-2.5 py-1 rounded-full bg-tg-surface/55 border border-tg-border/35 text-[11px] font-medium text-tg-hint">
                                    {f}
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-3.5 rounded-[16px] text-[15px] font-bold text-white active:scale-[0.985] transition-transform"
                        style={{
                            background: 'linear-gradient(135deg, var(--tg-accent, #3390ec) 0%, rgba(51,144,236,0.85) 100%)',
                            boxShadow: '0 6px 22px rgba(51,144,236,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
                        }}
                    >
                        {t('premium_continue_cta', 'Continue')}
                    </button>
                    <button
                        onClick={onViewSubscription}
                        className="w-full mt-2 py-3 rounded-[14px] text-[14px] font-semibold text-tg-hint border border-tg-border/35 bg-tg-surface/45 active:scale-[0.99] transition-transform"
                    >
                        {t('premium_view_subscription_cta', 'View subscription')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
