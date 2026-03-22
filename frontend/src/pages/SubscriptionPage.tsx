import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '../stores/subscription';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import type { PlanTier } from '../services/subscriptionApi';
import { createPortal } from 'react-dom';
import SubscriptionHero, { TIER_META } from '../components/subscription/SubscriptionHero';
import SubscriptionSettings from '../components/subscription/SubscriptionSettings';
import SubscriptionUsage from '../components/subscription/SubscriptionUsage';
import SubscriptionBenefits from '../components/subscription/SubscriptionBenefits';
import SubscriptionPlans from '../components/subscription/SubscriptionPlans';
import StickyHeader from '@/components/StickyHeader';
import { Loader2, Crown } from 'lucide-react';

export const showConfirmPopup = (options: {
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
    onCancel: () => void
}) => {
    const webApp = (window as any).Telegram?.WebApp;

    if (!webApp) return;

    webApp.showPopup({
        title: options.title,
        message: options.message,
        buttons: [
            { id: 'confirm', type: 'default', text: options.confirmLabel },
            { id: 'cancel', type: 'cancel', text: 'Cancel' },
        ],
    }, (buttonId: string) => {
        if (buttonId === 'confirm') {
            options.onConfirm();
        } else {
            options.onCancel();
        }
    });
};

// ── Confirm Modal Premium Estilo iOS ────────────────────────────────
export function ConfirmModal({
    title,
    message,
    confirmLabel,
    confirmColor,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onCancel]);

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-5 animate-fade-in">
            <div
                ref={modalRef}
                className="bg-tg-secondary border border-tg-border/40 rounded-[24px] p-6 max-w-[400px] w-full shadow-2xl animate-scale-in flex flex-col max-h-[80vh]"
            >
                <h3 className="text-[20px] font-bold text-tg-text mb-3 flex-shrink-0 leading-tight">
                    {title}
                </h3>

                <div className="overflow-y-auto mb-6 pr-2 custom-scrollbar">
                    <p className="text-[14px] font-medium text-tg-hint leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 mt-auto flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3.5 rounded-[16px] bg-tg-surface text-tg-text text-[15px] font-semibold transition-colors hover:bg-tg-surface/80 active:bg-tg-surface/60"
                    >
                        {t('common:cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 rounded-[16px] text-white text-[15px] font-bold transition-transform active:scale-95 shadow-sm"
                        style={{ background: confirmColor || 'var(--tg-accent)' }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// ── Main Page ────────────────────────────────────
export default function SubscriptionPage() {
    const { userId } = useParams();
    const { haptic } = useTelegram();
    const { t } = useTranslation('subscription');
    const showToast = useToastStore((s) => s.show);

    const { features, loading, load, changePlan, cancelChange, toggleAutoRenew } =
        useSubscriptionStore();

    const [modal, setModal] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        confirmColor?: string;
        action: () => Promise<void>;
    } | null>(null);

    useEffect(() => {
        load();
    }, [load]);

    // ── Handlers ──────────────────────────
    const handlePlanSelect = useCallback(
        (tier: PlanTier) => {
            if (!features) return;
            const current = features.subscription.tier;
            const tiers: PlanTier[] = ['free', 'pro', 'ultra'];
            const isUpgrade = tiers.indexOf(tier) > tiers.indexOf(current);

            setModal({
                title: isUpgrade ? t('upgrade_to', { plan: TIER_META[tier].label }) : t('change_to', { plan: TIER_META[tier].label }),
                message: isUpgrade
                    ? t('upgrade_message', { plan: TIER_META[tier].label })
                    : t('downgrade_message', { plan: TIER_META[tier].label }),
                confirmLabel: isUpgrade ? t('confirm_upgrade') : t('confirm_change'),
                confirmColor: TIER_META[tier].color,
                action: async () => {
                    try {
                        await changePlan(tier);
                        showToast(isUpgrade ? t('upgrade_success') : t('change_scheduled'), 'success');
                        haptic?.notificationOccurred('success');
                    } catch (e: any) {
                        showToast(e.message || 'Error', 'error');
                    }
                },
            });
        },
        [features, changePlan, showToast, haptic],
    );

    const handleCancelChange = useCallback(() => {
        setModal({
            title: t('cancel_change'),
            message: t('cancel_change_confirm'),
            confirmLabel: t('yes_cancel'),
            confirmColor: '#ef4444', // red-500
            action: async () => {
                try {
                    await cancelChange();
                    showToast(t('change_cancelled'), 'success');
                } catch (e: any) {
                    showToast(e.message || 'Error', 'error');
                }
            },
        });
    }, [cancelChange, showToast]);

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
    }, [features, toggleAutoRenew, showToast]);

    // ── Loading ───────────────────────────
    if (loading || !features) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-tg-accent" />
                <span className="text-[13px] font-medium text-tg-hint animate-pulse">{t('common:loading', 'Loading...')}</span>
            </div>
        );
    }

    const { subscription } = features;
    const tier = subscription.tier;
    const pendingPlan = subscription.change?.status === 'pending' ? subscription.change.new_plan : undefined;

    return (
        <div className="pb-28 animate-fade-in relative  flex flex-col gap-6">
            <StickyHeader 
                title={t('your_subscription', 'Subscription')} 
                subtitle={t('current_plan', { plan: TIER_META[tier]?.label || 'Free' })}
                icon={
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                } 
            />
            
            {/* 1. Hero */}
            <SubscriptionHero features={features} />

            {/* 2. Settings (auto-renew + pending change) */}
            <SubscriptionSettings
                features={features}
                onAutoRenewToggle={handleAutoRenewToggle}
                onCancelChange={handleCancelChange}
                haptic={haptic}
            />

            {/* 3. Usage Limits */}
            <SubscriptionUsage features={features} />

            {/* 4. Benefits Grid */}
            <SubscriptionBenefits features={features} />

            {/* 5. Plan Comparison */}
            <SubscriptionPlans
                currentTier={tier}
                pendingChange={pendingPlan}
                onSelect={handlePlanSelect}
            />

            <p className="mx-6 mt-2 mb-6 text-center text-[12px] font-medium text-tg-hint leading-relaxed opacity-80">
                {t('upgrade_note')}
            </p>

            {/* Confirm Modal */}
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
        </div>
    );
}