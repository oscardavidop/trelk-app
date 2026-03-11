import { useTranslation } from 'react-i18next';
import { Crown, AlertCircle, Activity, XCircle } from 'lucide-react';
import type { SubscriptionItem, SpentSummary } from '../../services/paymentsApi';

const STATUS_KEYS: Record<string, { bg: string; text: string; border: string; labelKey: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', labelKey: 'status_active' },
  CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', labelKey: 'status_cancelled' },
  CANCEL_PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', labelKey: 'status_cancelling' },
  SUSPENDED: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', labelKey: 'status_suspended' },
  EXPIRED: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', labelKey: 'status_expired' },
  APPROVAL_PENDING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', labelKey: 'status_pending' },
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
  
  // ── ESTADO: SIN SUSCRIPCIÓN ──
  if (!subscription) {
    return (
      <div className="rounded-[24px] bg-tg-secondary border border-tg-border/30 p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-[16px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0 shadow-inner">
            <AlertCircle className="w-6 h-6 text-tg-accent" />
          </div>
          <div>
            <p className="text-[16px] font-bold text-tg-text ">{t('no_active_sub')}</p>
            <p className="text-[13px] text-tg-hint/80 mt-0.5">{t('no_premium_plan')}</p>
          </div>
        </div>
        
        {totalSpent.length > 0 && (
          <div className="flex gap-3 pt-4 border-t border-white/5">
            {totalSpent.map((s) => (
              <div key={s.currency} className="flex-1 bg-black/10 rounded-2xl py-3 px-2 text-center border border-white/[0.02]">
                <p className="text-[20px] font-extrabold text-tg-text tabular-nums">${s.total.toFixed(2)}</p>
                <p className="text-[11px] font-medium text-tg-hint mt-0.5 uppercase tracking-wide">
                  {s.count} pagos · {s.currency}
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
  const nextBilling = subscription.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const startDate = subscription.start_time
    ? new Date(subscription.start_time).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="rounded-[24px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-xl">
      
      {/* ── Header con Degradado ── */}
      <div className="bg-gradient-to-br from-tg-accent/15 via-tg-secondary to-transparent p-5 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-tg-accent/20 border border-tg-accent/30 flex items-center justify-center shadow-inner backdrop-blur-sm">
              <Crown className="w-6 h-6 text-tg-accent" />
            </div>
            <div>
              <p className="text-[16px] font-extrabold text-tg-text ">{t('premium_subscription')}</p>
              <p className="text-[13px] font-medium text-tg-hint/80 mt-0.5">{t('monthly_plan_paypal')}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase  border ${status.bg} ${status.text} ${status.border}`}>
            {t(status.labelKey)}
          </span>
        </div>
      </div>

      {/* ── Detalles Principales ── */}
      <div className="p-5 space-y-5">
        
        {/* Grid de Información */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <InfoRow label={t('price')} value={`$${subscription.amount} ${subscription.currency}`} />
          <InfoRow label={t('plan_start')} value={startDate || '—'} />
          <InfoRow label={t('frequency')} value={t('monthly')} />
          <InfoRow label={t('next_billing')} value={nextBilling || '—'} highlight />
        </div>

        {/* Bloque de IDs Técnicos */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-tg-hint/80 tracking-wide">Subscription ID</span>
            <span className="text-[11px] font-mono text-tg-text/90 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
              {subscription.paypal_subscription_id}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-tg-hint/80 tracking-wide">Payer ID</span>
            <span className="text-[11px] font-mono text-tg-text/90 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
              {subscription.paypal_payerId}
            </span>
          </div>
        </div>

        {/* Resumen Histórico (Opcional si vienen props) */}
        {totalSpent.length > 0 && (
          <div className="flex gap-2.5 pt-4 border-t border-white/5">
            {totalSpent.map((s) => (
              <div key={s.currency} className="flex-1 bg-white/[0.03] rounded-[16px] p-3 text-center border border-white/[0.02]">
                <p className="text-[17px] font-extrabold text-tg-text tabular-nums ">${s.total.toFixed(2)}</p>
                <p className="text-[10px] font-medium text-tg-hint mt-0.5 uppercase tracking-wider">{s.count} pagos</p>
              </div>
            ))}
            <div className="flex-1 bg-white/[0.03] rounded-[16px] p-3 text-center border border-white/[0.02]">
              <p className="text-[17px] font-extrabold text-tg-text tabular-nums ">{totalSubscriptions}</p>
              <p className="text-[10px] font-medium text-tg-hint mt-0.5 uppercase tracking-wider">{t('subscriptions_label')}</p>
            </div>
          </div>
        )}

        {/* ── Botones de Acción ── */}
        <div className="flex gap-3 pt-2">
          {onViewEvents && (
            <button
              onClick={() => onViewEvents(subscription.paypal_subscription_id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] bg-tg-accent/10 border border-tg-accent/20 text-tg-accent text-[14px] font-bold transition-all active:scale-[0.98] active:bg-tg-accent/20"
            >
              <Activity size={16} />
              {t('events')}
            </button>
          )}
          {subscription.status === 'ACTIVE' && onCancel && (
            <button
              onClick={() => onCancel(subscription.paypal_subscription_id)}
              disabled={cancelling}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-400 text-[14px] font-bold transition-all active:scale-[0.98] active:bg-red-500/20 disabled:opacity-50 disabled:active:scale-100"
            >
              <XCircle size={16} />
              {cancelling ? t('processing') : t('cancel_plan')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente Auxiliar para Filas de Datos ──
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-tg-hint/70 uppercase ">{label}</span>
      <span className={`text-[15px] tabular-nums  ${highlight ? 'text-tg-accent font-extrabold' : 'text-tg-text font-semibold'}`}>
        {value}
      </span>
    </div>
  );
}