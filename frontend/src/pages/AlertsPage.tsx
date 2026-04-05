import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Clock } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useAlertsStore, groupAlerts, type DateGroup } from '../stores/alerts';
import { useToastStore } from '../stores';
import AlertRow from '../components/alerts/AlertRow';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import ChatBubbleDemo from '../components/ChatBubbleDemo';
import type { AlertItem } from '../services/alertsApi';

const GROUP_LABELS: Record<DateGroup, string> = {
    overdue: 'overdue',
    today: 'today',
    tomorrow: 'tomorrow',
    upcoming: 'upcoming',
};

const FILTERS = ['all', 'today', 'upcoming'] as const;

export default function AlertsPage() {
    const { t } = useTranslation('alerts');
    const { haptic } = useTelegram();
    const toast = useToastStore();
    const {
        items, loading, error, filter,
        selectedAlert,
        load, setFilter, deleteOne, deleteAll,
        openDetail, closeDetail, tick,
    } = useAlertsStore();

    // Initial fetch
    useEffect(() => { load(); }, [load]);

    // Live countdown — tick every second only when visible
    const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
    useEffect(() => {
        tickRef.current = setInterval(() => {
            if (!document.hidden) tick();
        }, 1000);
        return () => clearInterval(tickRef.current);
    }, [tick]);

    // Back button handling for modal
    useEffect(() => {
        if (!selectedAlert) return;
        const back = window.Telegram?.WebApp?.BackButton;
        if (back) {
            back.show();
            const handler = () => closeDetail();
            back.onClick(handler);
            return () => { back.offClick(handler); };
        }
    }, [selectedAlert, closeDetail]);

    const handleTap = useCallback((item: AlertItem) => {
        haptic?.impactOccurred('light');
        openDetail(item.id);
    }, [haptic, openDetail]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteOne(id);
            haptic?.notificationOccurred('success');
            toast.show(t('alert_deleted'), 'success');
        } catch {
            haptic?.notificationOccurred('error');
            toast.show(t('delete_error'), 'error');
        }
    }, [deleteOne, haptic, toast, t]);

    const handleDeleteAll = useCallback(async () => {
        if (!items.length) return;
        try {
            const count = await deleteAll();
            haptic?.notificationOccurred('success');
            toast.show(t('all_deleted', { count }), 'success');
        } catch {
            haptic?.notificationOccurred('error');
            toast.show(t('delete_error'), 'error');
        }
    }, [items.length, deleteAll, haptic, toast, t]);

    const handleModalDelete = useCallback(async (id: string) => {
        await deleteOne(id);
        haptic?.notificationOccurred('success');
        toast.show(t('alert_deleted'), 'success');
    }, [deleteOne, haptic, toast, t]);

    const groups = groupAlerts(items, filter);
    const scheduledCount = items.filter((a) => a.status === 'scheduled').length;

    return (
        <div className="pb-24 animate-fade-in relative">
            {/* ── Header ── */}
            <div className="sticky top-0 z-30 bg-tg-bg/90 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-[22px] font-bold text-tg-text">{t('title')}</h1>
                        {scheduledCount > 0 && (
                            <span className="text-[13px] font-medium text-tg-text bg-tg-secondary px-2.5 py-0.5 rounded-full">
                                {scheduledCount}
                            </span>
                        )}
                    </div>

                    {items.length > 1 && (
                        <button
                            onClick={() => { haptic?.impactOccurred('medium'); handleDeleteAll(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 active:scale-95 transition-all"
                        >
                            <Trash2 size={13} />
                            {t('clear_all')}
                        </button>
                    )}
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => { haptic?.selectionChanged(); setFilter(f); }}
                            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all active:scale-95 ${filter === f
                                    ? 'bg-tg-accent text-white shadow-sm'
                                    : 'bg-tg-secondary text-tg-text hover:brightness-110'
                                }`}
                        >
                            {t(`filter_${f}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="px-4 mt-4">
                    <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3.5 px-4 py-4 border-b border-tg-border/10 last:border-0">
                                <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-surface animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-3/4 bg-tg-surface rounded animate-pulse" />
                                    <div className="h-2.5 w-1/2 bg-tg-surface/60 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Bell size={28} className="text-red-400" />
                    </div>
                    <p className="text-[16px] font-bold text-tg-text">{t('error_title')}</p>
                    <p className="text-[13px] text-tg-hint mt-2">{t('error_desc')}</p>
                    <button
                        onClick={load}
                        className="mt-4 px-5 py-2.5 rounded-full bg-tg-accent text-white text-[14px] font-semibold active:scale-95 transition-all"
                    >
                        {t('retry')}
                    </button>
                </div>
            ) : items.length === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center pt-16 text-center px-6">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-tg-secondary flex items-center justify-center">
                            <Clock size={36} className="text-tg-hint/25" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-tg-accent/10 flex items-center justify-center border-4 border-tg-bg">
                            <Bell size={18} className="text-tg-accent" />
                        </div>
                    </div>
                    <p className="text-[18px] font-bold text-tg-text">{t('empty_title')}</p>
                    <p className="text-[14px] text-tg-hint mt-2 max-w-[260px] leading-relaxed mb-6">
                        {t('empty_desc')}
                    </p>

                    {/* ── Chat demo ── */}
                    <div className="w-full max-w-[320px] bg-tg-secondary/40 border border-tg-border/20 rounded-[20px] p-4 mb-4">
                        <p className="text-[11px] font-bold text-tg-hint/60 uppercase tracking-wider mb-3 text-left">{t('empty_try')}</p>
                        <ChatBubbleDemo
                            messages={[
                                { text: '/alerta 10m estudiar', delay: 0.5 },
                                { text: '⏰ ¡Alerta programada!\nTe avisaré en 10 minutos: "estudiar"', isBot: true, delay: 1.2 },
                            ]}
                        />
                    </div>
                </div>
            ) : (
                /* ── Alert list grouped ── */
                <div className="px-4 mt-2">
                    <AnimatePresence mode="popLayout">
                        {groups.map((group) => (
                            <motion.div
                                key={group.label}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mb-4"
                            >
                                {/* Group header */}
                                <div className="py-2 px-1 mb-1">
                                    <span className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">
                                        {t(`group_${group.label}`)}
                                    </span>
                                </div>

                                {/* Items */}
                                <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm">
                                    <AnimatePresence mode="popLayout">
                                        {group.items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                                            >
                                                <AlertRow
                                                    item={item}
                                                    onTap={handleTap}
                                                    onDelete={handleDelete}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Detail Modal ── */}
            <AlertDetailModal
                open={!!selectedAlert}
                alert={selectedAlert}
                onClose={closeDetail}
                onDelete={handleModalDelete}
            />
        </div>
    );
}
