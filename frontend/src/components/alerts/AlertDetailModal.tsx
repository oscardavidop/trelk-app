import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import {
  X,
  Trash2,
  Clock,
  MessageSquare,
  Calendar,
  Send,
  Hash,
  Timer,
  Zap,
  Bell,
  Moon
} from 'lucide-react';

import { useTelegram } from '../../hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import type { AlertItem } from '../../services/alertsApi';

import {
  formatCountdown,
  formatFullDate,
  getAlertUrgency,
  getProgress,
} from '../../utils/alertHelpers';

interface Props {
  alert: AlertItem | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3600) return `${Math.floor(totalSeconds / 60)}m`;
  if (totalSeconds < 86400) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(totalSeconds / 86400);
  return `${d}d`;
}

export default function AlertDetailModal({
  alert,
  open,
  onClose,
  onDelete
}: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('alerts');

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Lock scroll (igual que el otro modal) ── */
  useEffect(() => {
    if (!open) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open]);

  const handleDelete = useCallback(async () => {
    if (!alert) return;

    if (!confirming) {
      setConfirming(true);
      haptic?.impactOccurred('medium');
      return;
    }

    setDeleting(true);
    haptic?.notificationOccurred('success');

    try {
      await onDelete(alert.id);
      onClose();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }, [alert, confirming, haptic, onClose, onDelete]);

  if (!open || !alert) return null;

  const urgency = getAlertUrgency(alert);
  const progress = getProgress(alert);
  const isExpired = alert.status === 'expired';

  const urgencyColor =
    urgency === 'expired' ? 'text-tg-hint' :
    urgency === 'urgent' ? 'text-orange-500' :
    urgency === 'soon' ? 'text-amber-500' : 'text-tg-accent';

  const progressBarColor =
    alert.secondsLeft <= 30 ? 'from-orange-500 to-red-500' :
    alert.secondsLeft <= 120 ? 'from-amber-400 to-orange-400' :
    'from-tg-accent to-blue-500';

  const UrgencyIcon =
    urgency === 'expired' ? Moon :
    urgency === 'urgent' ? Zap :
    urgency === 'soon' ? Bell : Clock;

  const content = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
        onClick={onClose}
      >
        {/* BACKDROP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* MODAL */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-md max-h-[90vh] bg-tg-secondary rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-tg-border/40"
        >
          {/* HANDLE */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
          </div>

          {/* HEADER */}
          <div className="px-5 pt-3 pb-4 border-b border-tg-border/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center ${
                isExpired ? 'bg-tg-hint/10' :
                urgency === 'urgent' ? 'bg-orange-500/10' :
                urgency === 'soon' ? 'bg-amber-500/10' : 'bg-tg-accent/10'
              }`}>
                <UrgencyIcon size={18} className={urgencyColor} />
              </div>

              <div>
                <h2 className="text-[17px] font-bold text-tg-text">
                  {t('detail_title')}
                </h2>
                <span className="text-[11px] text-tg-hint">
                  ID: {alert.publicId || alert.id.slice(-5)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-full bg-tg-hint/10 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* BODY SCROLL */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* COUNTDOWN */}
            {!isExpired && (
              <div className="rounded-[18px] bg-tg-bg p-4 border border-tg-border/20">
                <div className="flex justify-between mb-2">
                  <span className="text-[11px] text-tg-hint uppercase">
                    {t('time_left')}
                  </span>
                  <span className="text-[11px] text-tg-hint">
                    {Math.round((1 - progress) * 100)}%
                  </span>
                </div>

                <p className="text-[34px] font-extrabold text-tg-text">
                  {formatCountdown(alert.secondsLeft)}
                </p>

                <div className="mt-3 h-[6px] bg-tg-border/20 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${progressBarColor}`}
                    animate={{ width: `${(1 - progress) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* EXPIRED */}
            {isExpired && (
              <div className="flex items-center gap-2 bg-tg-hint/10 p-3 rounded-[12px] text-tg-hint text-[13px] font-semibold">
                <Moon size={16} />
                {t('alert_expired')}
              </div>
            )}

            {/* MESSAGE */}
            <div className="bg-tg-bg p-4 rounded-[16px] border border-tg-border/20">
              <div className="flex gap-2 mb-2 text-tg-hint text-[11px] uppercase">
                <MessageSquare size={12} />
                {t('message')}
              </div>

              <p className="text-[14px] text-tg-text">
                {alert.text || t('no_message')}
              </p>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-tg-bg p-3 rounded-[12px]">
                <Send size={12} />
                <p>{alert.type}</p>
              </div>

              <div className="flex items-center gap-2 bg-tg-bg p-3 rounded-[12px]">
                <Hash size={12} />
                <p>{formatDuration(alert.totalSeconds)}</p>
              </div>
            </div>

            {/* DATE */}
            <div className="flex items-center gap-2 bg-tg-bg p-3 rounded-[12px]">
              <Calendar size={12} />
              <p>{moment(alert.runAt).format('MMMM Do YYYY, h:mm:ss a')}</p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-5 border-t border-tg-border/20">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`w-full py-3.5 rounded-[16px] font-bold flex items-center justify-center gap-2 transition-all ${
                confirming
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              <Trash2 size={16} />
              {deleting
                ? t('deleting')
                : confirming
                ? t('confirm_delete')
                : t('cancel_alert')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}