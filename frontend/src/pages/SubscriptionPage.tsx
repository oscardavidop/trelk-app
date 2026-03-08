import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSubscriptionStore } from '../stores/subscription';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import type { PlanTier } from '../services/subscriptionApi';
import LimitBar, { StaticLimit } from '../components/LimitBar';
import PlanComparison from '../components/PlanComparison';
import SectionHeader from '../components/SectionHeader';
import { createPortal } from 'react-dom';
import {
    Crown,
    Zap,
    Sparkles,
    Shield,
    RefreshCw,
    Clock,
    AlertTriangle,
    XCircle,
    Gauge,
    Headphones,
    Terminal,
    Download,
    Bell,
    Globe,
    QrCode,
    ArrowBigDown,
    Folder,
    Loader,
    Loader2,
} from 'lucide-react';

// ── Tier meta ────────────────────────────────────
const TIER_META: Record<PlanTier, { label: string; color: string; gradient: string; Icon: typeof Crown }> = {
    free: { label: 'Free', color: '#9ca3af', gradient: 'from-gray-600/40 to-gray-800/20', Icon: Zap },
    pro: { label: 'Pro', color: '#f5a623', gradient: 'from-amber-500/40 to-orange-600/20', Icon: Crown },
    ultra: { label: 'Ultra', color: '#a855f7', gradient: 'from-purple-500/40 to-pink-600/20', Icon: Sparkles },
};

function timeUntil(isoDate?: string): string {
    if (!isoDate) return 'Sin expiración';
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h restantes`;
    return `${hours}h restantes`;
}

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
            { id: 'cancel', type: 'cancel', text: 'Cancelar' },
        ],
    }, (buttonId: string) => {
        if (buttonId === 'confirm') {
            options.onConfirm();
        } else {
            options.onCancel();
        }
    });
};

// ── Confirm Modal ────────────────────────────────
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-fade-in">
            <div
                ref={modalRef}
                className="bg-tg-secondary border border-white/5 rounded-[24px] p-6 max-w-sm w-full shadow-2xl animate-scale-in flex flex-col max-h-[80vh]"
            >
                <h3 className="text-[19px] font-bold text-tg-text mb-3 flex-shrink-0 tracking-tight">
                    {title}
                </h3>

                <div className="overflow-y-auto mb-6 pr-2 custom-scrollbar">
                    <p className="text-[15px] text-tg-hint leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3 mt-auto flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl bg-white/[0.08] text-tg-text text-[15px] font-medium transition-colors hover:bg-white/15 active:bg-white/20"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl text-white text-[15px] font-semibold transition-transform active:scale-95 shadow-lg"
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
                title: isUpgrade ? `Upgrade a ${TIER_META[tier].label}` : `Cambiar a ${TIER_META[tier].label}`,
                message: isUpgrade
                    ? `Obtendrás acceso inmediato a todas las funciones ${TIER_META[tier].label}. Se aplicará al instante.`
                    : `Tu plan actual continuará hasta que expire. Luego cambiará a ${TIER_META[tier].label}.`,
                confirmLabel: isUpgrade ? 'Confirmar Upgrade' : 'Confirmar cambio',
                confirmColor: TIER_META[tier].color,
                action: async () => {
                    try {
                        await changePlan(tier);
                        showToast(isUpgrade ? '¡Upgrade exitoso!' : 'Cambio programado', 'success');
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
            title: 'Cancelar cambio',
            message: '¿Estás seguro de cancelar el cambio de plan programado?',
            confirmLabel: 'Sí, cancelar',
            confirmColor: '#ef4444', // red-500
            action: async () => {
                try {
                    await cancelChange();
                    showToast('Cambio cancelado', 'success');
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
                title: 'Desactivar Auto-Renew',
                message: 'Si desactivas la renovación automática, tu plan expirará al final del período actual y perderás los beneficios premium.',
                confirmLabel: 'Desactivar',
                confirmColor: '#ef4444',
                action: async () => {
                    try {
                        await toggleAutoRenew(false);
                        showToast('Auto-renew desactivado', 'info');
                    } catch (e: any) {
                        showToast(e.message || 'Error', 'error');
                    }
                },
            });
        } else {
            toggleAutoRenew(true)
                .then(() => showToast('Auto-renew activado', 'success'))
                .catch((e) => showToast(e.message || 'Error', 'error'));
        }
    }, [features, toggleAutoRenew, showToast]);

    // ── Loading ───────────────────────────
    if (loading || !features) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-12 h-12 text-tg-hint animate-spin" />
            </div>
        );
    }

    const { subscription, limits, performance, support, custom_commands } = features;
    const tier = subscription.tier;
    const meta = TIER_META[tier];
    const TierIcon = meta.Icon;
    const pendingPlan = subscription.change?.status === 'pending' ? subscription.change.new_plan : undefined;

    return (
        <div className="tm-main pb-12 animate-fade-in space-y-6">
            
            {/* ── Hero Card ── */}
            <div className="mx-4 mt-4 animate-scale-in">
                <div className={`relative rounded-[24px] overflow-hidden bg-gradient-to-br ${meta.gradient} p-6 shadow-lg ring-1 ring-white/10`}>
                    {/* Decorative glow */}
                    <div
                        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
                        style={{ background: meta.color }}
                    />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm"
                                style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}
                            >
                                <TierIcon className="w-7 h-7" style={{ color: meta.color }} />
                            </div>
                            <div>
                                <div className="text-[22px] font-extrabold text-tg-text tracking-tight">
                                    Plan {meta.label}
                                </div>
                                <div className="text-[14px] text-tg-hint/90 flex items-center gap-1.5 mt-0.5 font-medium">
                                    <Clock className="w-4 h-4" />
                                    {tier === 'free' ? 'Sin expiración' : timeUntil(subscription.expires_at)}
                                </div>
                            </div>
                        </div>

                        {/* Quick stats row - Glassmorphism effect */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-black/20 backdrop-blur-md rounded-[16px] p-3 text-center border border-white/5">
                                <div className="text-[12px] text-tg-hint/80 mb-1 font-medium">Prioridad</div>
                                <div className="text-[14px] font-bold text-white capitalize tracking-wide">
                                    {performance.queue_priority}
                                </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md rounded-[16px] p-3 text-center border border-white/5">
                                <div className="text-[12px] text-tg-hint/80 mb-1 font-medium">Velocidad</div>
                                <div className="text-[14px] font-bold text-white tracking-wide">
                                    {performance.response_speed_multiplier}x
                                </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md rounded-[16px] p-3 text-center border border-white/5">
                                <div className="text-[12px] text-tg-hint/80 mb-1 font-medium">Soporte</div>
                                <div className="text-[14px] font-bold text-white capitalize tracking-wide">
                                    {support.priority}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Pending Change Banner ── */}
            {subscription.change?.status === 'pending' && (
                <div className="mx-4 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-[20px] p-4 animate-slide-up">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-semibold text-amber-400">Cambio pendiente</div>
                            <div className="text-[14px] text-tg-hint mt-1 leading-snug">
                                De <span className="text-tg-text font-semibold">{subscription.change.changed_from}</span> a{' '}
                                <span className="text-tg-text font-semibold">{subscription.change.new_plan}</span>
                                {subscription.change.change_date && (
                                    <span className="block mt-0.5 text-[13px] opacity-80">
                                        Aplicable el {new Date(subscription.change.change_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCancelChange}
                                className="mt-3 flex items-center gap-1.5 text-[14px] text-red-400 hover:text-red-300 font-semibold transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                Cancelar cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Auto Renew ── */}
            {tier !== 'free' && (
                <div>
                    <SectionHeader title="Renovación" />
                    <div className="mx-4 bg-tg-secondary rounded-[20px] overflow-hidden">
                        <div
                            className="tm-row cursor-pointer p-4 transition-colors hover:bg-white/[0.02]"
                            onClick={() => {
                                haptic?.impactOccurred('light');
                                handleAutoRenewToggle();
                            }}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <RefreshCw className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-[16px] font-medium text-tg-text">Auto-Renew</div>
                                    <div className="text-[13px] text-tg-hint mt-0.5">
                                        {subscription.auto_renew
                                            ? 'Se renovará automáticamente'
                                            : 'No se renovará al expirar'}
                                    </div>
                                </div>
                            </div>
                            <div
                                className={`tm-toggle ${subscription.auto_renew ? 'on' : ''} ml-4 scale-110 origin-right`}
                                role="switch"
                                aria-checked={subscription.auto_renew}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Usage Limits ── */}
            <div>
                <SectionHeader title="Uso diario" />
                <div className="mx-4 bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-white/[0.04] animate-stagger">
                    <LimitBar icon={<Download className="w-4 h-4" />} label="Downloads" counter={limits.downloads_per_day} />
                    <LimitBar icon={<ArrowBigDown className="w-4 h-4" />} label="AI Requests" counter={limits.ai_requests_per_day} />
                    <LimitBar icon={<Zap className="w-4 h-4" />} label="Premium AI" counter={limits.premium_ai_requests_per_day} />
                    <LimitBar icon={<Bell className="w-4 h-4" />} label="Alertas diarias" counter={limits.alerts.per_day} />
                    <LimitBar icon={<Globe className="w-4 h-4" />} label="SSWeb" counter={limits.ssweb.per_day} />
                    <LimitBar icon={<QrCode className="w-4 h-4" />} label="QR" counter={limits.qr.per_day} />
                </div>
            </div>

            {/* ── Total / Static limits ── */}
            <div>
                <SectionHeader title="Límites generales" />
                <div className="mx-4 bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-white/[0.04]">
                    <LimitBar icon={<Bell className="w-4 h-4" />} label="Alertas totales" counter={{ total: limits.alerts.total, used: limits.alerts.used }} />
                    <StaticLimit icon={<Folder className="w-4 h-4" />} label="Archivo máximo" value={limits.file_upload_size_mb} suffix="MB" />
                </div>
            </div>

            {/* ── Unlocked Benefits ── */}
            <div>
                <SectionHeader title="Beneficios" />
                <div className="mx-4 bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-white/[0.04]">
                    <div className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Gauge className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[15px] font-medium text-tg-text">Cola de prioridad</div>
                            <div className="text-[13px] text-tg-hint mt-0.5 capitalize">{performance.queue_priority}</div>
                        </div>
                    </div>
                    
                    <div className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[15px] font-medium text-tg-text">Multiplicador de velocidad</div>
                            <div className="text-[13px] text-tg-hint mt-0.5">{performance.response_speed_multiplier}x</div>
                        </div>
                    </div>
                    
                    <div className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Headphones className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[15px] font-medium text-tg-text">Soporte</div>
                            <div className="text-[13px] text-tg-hint mt-0.5 capitalize">
                                {support.priority}
                                {support.live_chat_access && <span className="text-emerald-400/80 font-medium"> • Live Chat</span>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Terminal className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[15px] font-medium text-tg-text">Comandos personalizados</div>
                            <div className="text-[13px] text-tg-hint mt-0.5">
                                {custom_commands.available
                                    ? `${custom_commands.used_commands || 0} / ${custom_commands.max_commands} usados`
                                    : 'No disponible'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Plan Comparison ── */}
            <div>
                <SectionHeader title="Planes" />
                <PlanComparison
                    currentTier={tier}
                    pendingChange={pendingPlan}
                    onSelect={handlePlanSelect}
                />
            </div>

            <p className="mx-6 mt-6 mb-4 text-center text-[13px] text-tg-hint leading-relaxed opacity-80">
                Los cambios de plan se procesan de forma segura. Los upgrades aplican inmediatamente, los downgrades al final del período.
            </p>

            {/* ── Confirm Modal ── */}
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