import { useTranslation } from 'react-i18next';
import { Crown, AlertCircle, Activity, XCircle } from 'lucide-react';
import type { SubscriptionItem, SpentSummary } from '../../services/paymentsApi';
import { useState } from 'react';
import { ConfirmModal } from '../ConfirmModal';

const STATUS_KEYS: Record<string, { bg: string; text: string; border: string; labelKey: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', labelKey: 'status_active' },
  CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', labelKey: 'status_cancelled' },
  CANCEL_PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', labelKey: 'status_cancelling' },
  SUSPENDED: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', labelKey: 'status_suspended' },
  EXPIRED: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/20', labelKey: 'status_expired' },
  APPROVAL_PENDING: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', labelKey: 'status_pending' },
};

interface SubscriptionCardProps {
  subscription: SubscriptionItem | null;
  totalSpent: SpentSummary[];
  totalSubscriptions: number;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
  onViewEvents?: (id: string) => void;
}

export default function SubscriptionCard({
  subscription,
  totalSpent,
  totalSubscriptions,
  onCancel,
  cancelling,
  onViewEvents,
}: SubscriptionCardProps) {
  const { t } = useTranslation('payments');
  const [modalOpen, setModalOpen] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    action: () => Promise<void>;
  } | null>(null);

  // ── ESTADO: SIN SUSCRIPCIÓN ──
  if (!subscription) {
    return (
      <div className="rounded-[24px] bg-tg-secondary border border-tg-border/40 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-[52px] h-[52px] rounded-[16px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertCircle className="w-7 h-7 text-tg-accent" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[17px] font-bold text-tg-text leading-tight mb-1">{t('no_active_sub', 'No Active Subscription')}</p>
            <p className="text-[13px] font-medium text-tg-hint leading-snug">{t('no_premium_plan', 'You are currently on the free plan.')}</p>
          </div>
        </div>

        {totalSpent.length > 0 && (
          <div className="flex gap-3 pt-5 border-t border-tg-border/20">
            {totalSpent.map((s) => (
              <div key={s.currency} className="flex-1 bg-tg-hint/5 rounded-[16px] py-3.5 px-3 text-center border border-tg-border/10">
                <p className="text-[20px] font-black text-tg-text tabular-nums tracking-tight">${s.total.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-tg-hint mt-1 uppercase tracking-wide">
                  {s.count} {t('common:payments', 'payments')} · {s.currency}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── ESTADO: CON SUSCRIPCIÓN ──
  const status = STATUS_KEYS[subscription.status] || STATUS_KEYS.ACTIVE;
  const provider = subscription.provider || 'paypal';
  const providerLabel =
    provider === 'telegram_card'
      ? t('provider_telegram_card', 'Telegram Card')
      : provider === 'telegram_stars'
        ? t('provider_telegram_stars', 'Telegram Stars')
        : t('provider_paypal', 'PayPal');
  const nextBilling = subscription.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const startDate = subscription.start_time
    ? new Date(subscription.start_time).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const amountText = (() => {
    if ((subscription.currency || '').toUpperCase() === 'XTR') {
      return `${Math.round(subscription.amount)} XTR`;
    }
    return `$${Number(subscription.amount || 0).toFixed(2)} ${subscription.currency}`;
  })();

  return (
    <div className="rounded-[24px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">

      {/* ── Header con Degradado Semántico ── */}
      <div className="relative p-3 border-b border-tg-border/20 overflow-hidden">
        {/* Fondo sutil (usa currentColor con opacidad en Tailwind para adaptarse) */}
        <div className="absolute inset-0 bg-tg-accent/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-tg-accent/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-[14px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center shadow-sm">
              <Crown className="w-5 h-5 text-tg-accent" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[17px] font-bold text-tg-text leading-tight mb-0.5">{t('premium_subscription', 'Premium Subscription')}</p>
              <p className="text-[13px] font-medium text-tg-hint">
                {t('monthly_plan_provider', { provider: providerLabel, defaultValue: `Monthly plan via ${providerLabel}` })}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wider border shadow-sm ${status.bg} ${status.text} ${status.border}`}>
            {t(status.labelKey)}
          </span>
        </div>
      </div>

      {/* ── Detalles Principales ── */}
      <div className="p-5 space-y-5">

        {/* Grid de Información */}
        <div className="grid grid-cols-2 gap-y-5 gap-x-3">
          <InfoRow label={t('price', 'Price')} value={amountText} />
          <InfoRow label={t('plan_start', 'Started On')} value={startDate || '—'} />
          <InfoRow label={t('frequency', 'Billing Cycle')} value={t('monthly', 'Monthly')} />
          <InfoRow label={t('next_billing', 'Next Billing')} value={nextBilling || '—'} highlight />
        </div>

        {/* Bloque de IDs Técnicos */}
        <div className="pt-5 border-t border-tg-border/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-tg-hint tracking-wide">Subscription ID</span>
            <span className="text-[12px] font-mono font-medium text-tg-text bg-tg-hint/10 px-2.5 py-1 rounded-[8px] border border-tg-border/30">
              {subscription.paypal_subscription_id}
            </span>
          </div>
          {provider === 'paypal' ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-tg-hint tracking-wide">Payer ID</span>
              <span className="text-[12px] font-mono font-medium text-tg-text bg-tg-hint/10 px-2.5 py-1 rounded-[8px] border border-tg-border/30">
                {subscription.paypal_payerId}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-tg-hint tracking-wide">
                {t('payment_method', 'Payment Method')}
              </span>
              <span className="text-[12px] font-medium text-tg-text bg-tg-hint/10 px-2.5 py-1 rounded-[8px] border border-tg-border/30">
                {providerLabel}
              </span>
            </div>
          )}
        </div>

        {/* Resumen Histórico (Opcional si vienen props) */}
        {totalSpent.length > 0 && (
          <div className="flex gap-3 pt-5 border-t border-tg-border/20">
            {totalSpent.map((s) => (
              <div key={s.currency} className="flex-1 bg-tg-hint/5 rounded-[16px] p-3 text-center border border-tg-border/10">
                <p className="text-[18px] font-black text-tg-text tabular-nums tracking-tight">${s.total.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-tg-hint mt-1 uppercase tracking-wider">{s.count} {t('common:payments', 'payments')}</p>
              </div>
            ))}
            <div className="flex-1 bg-tg-hint/5 rounded-[16px] p-3 text-center border border-tg-border/10">
              <p className="text-[18px] font-black text-tg-text tabular-nums tracking-tight">{totalSubscriptions}</p>
              <p className="text-[10px] font-bold text-tg-hint mt-1 uppercase tracking-wider">{t('subscriptions_label', 'Subscriptions')}</p>
            </div>
          </div>
        )}

        {/* ── Botones de Acción ── */}
        <div className="flex gap-3 pt-3">
          {onViewEvents && (
            <button
              onClick={() => onViewEvents(subscription.paypal_subscription_id)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-tg-accent/10 border border-tg-accent/20 text-tg-accent text-[14px] font-bold transition-transform active:scale-[0.98] shadow-sm hover:bg-tg-accent/15"
            >
              <Activity size={18} strokeWidth={2.5} />
              {t('events', 'View Events')}
            </button>
          )}
          {subscription.status === 'ACTIVE' && onCancel && (
            <button
              onClick={() => setModalOpen({
                title: t('cancel_confirm', 'Confirm Cancellation'),
                message: t('cancel_confirm_message', 'Are you sure you want to cancel this subscription? You will keep access until the end of the billing period.'),
                confirmLabel: t('yes_cancel', 'Yes, Cancel'),
                confirmColor: '#ef4444',
                action: async () => {
                  await onCancel(subscription.paypal_subscription_id);
                },
              })}
              disabled={cancelling}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-500 text-[14px] font-bold transition-transform active:scale-[0.98] shadow-sm hover:bg-red-500/15 disabled:opacity-50 disabled:active:scale-100"
            >
              <XCircle size={18} strokeWidth={2.5} />
              {cancelling ? t('processing', 'Processing...') : t('cancel_plan', 'Cancel Plan')}
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <ConfirmModal
          title={modalOpen.title}
          message={modalOpen.message}
          confirmLabel={modalOpen.confirmLabel}
          confirmColor={modalOpen.confirmColor}
          onConfirm={async () => {
            await modalOpen.action();
            setModalOpen(null);
          }}
          onCancel={() => setModalOpen(null)}
        />
      )}
    </div>


  );
}

// ── Componente Auxiliar para Filas de Datos ──
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-tg-hint uppercase tracking-wider">{label}</span>
      <span className={`text-[15px] tabular-nums tracking-tight ${highlight ? 'text-tg-accent font-black' : 'text-tg-text font-bold'}`}>
        {value}
      </span>
    </div>
  );
}