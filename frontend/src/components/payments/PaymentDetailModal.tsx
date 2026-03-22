import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import type { PaymentEventItem } from '../../services/paymentsApi';

interface PaymentDetailModalProps {
  event: PaymentEventItem | null;
  onClose: () => void;
}

export default function PaymentDetailModal({ event, onClose }: PaymentDetailModalProps) {
  const { t } = useTranslation('payments');
  if (!event) return null;

  const date = new Date(event.create_time || event.createdAt);
  const isPayment = event.eventType.startsWith('PAYMENT.SALE.');
  const isSubscription = event.eventType.startsWith('BILLING.SUBSCRIPTION.');

  const content = (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" 
      onClick={onClose}
    >
      {/* ── Fondo Oscurecido ── */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      {/* ── Contenedor del Modal ── */}
      <div
        className="relative w-full sm:max-w-[440px] max-h-[90vh] bg-tg-bg rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl sm:animate-scale-in animate-slide-up border border-tg-border/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (Solo móvil) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
        </div>

        {/* ── Header ── */}
        <div className="px-5 pt-3 pb-4 border-b border-tg-border/20 flex-shrink-0 bg-tg-bg/95 backdrop-blur-xl z-10 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-tg-text leading-tight">{t('event_detail', 'Event Detail')}</h3>
              <p className="text-[13px] font-mono font-medium text-tg-hint mt-1 truncate max-w-[250px]">
                {event.event_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-full bg-tg-hint/10 flex items-center justify-center text-tg-hint hover:bg-tg-hint/20 hover:text-tg-text active:scale-95 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Contenido Scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Alerta de Seguridad Crítica */}
          {event.invalid_signature && (
            <div className="p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 flex items-start gap-3.5 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="text-[14px] font-bold text-red-500 mb-0.5">{t('invalid_signature', 'Invalid Signature')}</p>
                <p className="text-[13px] font-medium text-red-500/80 leading-snug">
                  {t('signature_not_verified', 'The payload signature could not be verified.')}
                </p>
              </div>
            </div>
          )}

          {/* Tipo y Estado */}
          <Section title={t('general_info', 'General Information')}>
            <Row label={t('type', 'Type')} value={event.eventType} mono />
            <Row 
              label={t('date', 'Date')} 
              value={date.toLocaleString(undefined, {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })} 
            />
            <Row label={t('summary', 'Summary')} value={event.summary || '—'} />
            <Row label={t('processed', 'Processed')} value={event.processed ? t('yes', 'Yes') : t('no', 'No')} highlight={!event.processed} />
          </Section>

          {/* Detalles de Suscripción */}
          {isSubscription && event.resource && (
            <Section title={t('subscription', 'Subscription')}>
              <Row label="ID" value={event.resource.id || '—'} mono />
              <Row label={t('status', 'Status')} value={event.resource.status || '—'} highlight />
              <Row label={t('plan_id', 'Plan ID')} value={event.resource.plan_id || '—'} mono />
              {event.resource.start_time && (
                <Row label={t('start', 'Started On')} value={new Date(event.resource.start_time).toLocaleDateString(undefined)} />
              )}
              {event.resource.status_update_time && (
                <Row label={t('last_change', 'Last Updated')} value={new Date(event.resource.status_update_time).toLocaleString(undefined)} />
              )}
            </Section>
          )}

          {/* Detalles de Pago */}
          {isPayment && event.resource && (
            <Section title={t('payment_details', 'Payment Details')}>
              <Row label="Transaction ID" value={event.resource.id || '—'} mono />
              <Row label={t('status', 'Status')} value={event.resource.state || '—'} highlight />
              {event.resource.amount && (
                <Row
                  label={t('amount', 'Amount')}
                  value={`$${event.resource.amount.total} ${event.resource.amount.currency}`}
                  highlight
                />
              )}
              {event.resource.transaction_fee && (
                <Row
                  label={t('paypal_fee', 'Fee')}
                  value={`$${event.resource.transaction_fee.value} ${event.resource.transaction_fee.currency}`}
                />
              )}
              {event.resource.payment_mode && (
                <Row label={t('mode', 'Mode')} value={event.resource.payment_mode} />
              )}
              {event.resource.billing_agreement_id && (
                <Row label={t('subscription', 'Subscription')} value={event.resource.billing_agreement_id} mono />
              )}
            </Section>
          )}

          {/* Información de Facturación */}
          {event.billing_info && (
            <Section title={t('billing', 'Billing Information')}>
              {event.billing_info.last_payment && (
                <Row
                  label={t('last_payment', 'Last Payment')}
                  value={`$${event.billing_info.last_payment.amount.value} ${event.billing_info.last_payment.amount.currency_code} — ${new Date(event.billing_info.last_payment.time).toLocaleDateString(undefined)}`}
                />
              )}
              {event.billing_info.next_billing_time && (
                <Row
                  label={t('next_billing', 'Next Billing')}
                  value={new Date(event.billing_info.next_billing_time).toLocaleDateString(undefined, {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                  highlight
                />
              )}
              {event.billing_info.outstanding_balance && (
                <Row
                  label={t('outstanding_balance', 'Outstanding Balance')}
                  value={`$${event.billing_info.outstanding_balance.value} ${event.billing_info.outstanding_balance.currency_code}`}
                />
              )}
              <Row
                label={t('failed_payments', 'Failed Payments')}
                value={String(event.billing_info.failed_payments_count ?? 0)}
                highlight={Number(event.billing_info.failed_payments_count) > 0}
              />
            </Section>
          )}

          {/* Pagador */}
          {event.subscriber && (
            <Section title={t('payer', 'Subscriber')}>
              {event.subscriber.name && (
                <Row label={t('name', 'Name')} value={`${event.subscriber.name.given_name} ${event.subscriber.name.surname}`} />
              )}
              <Row label="Payer ID" value={event.subscriber.payer_id} mono />
              <Row label="Email" value={event.subscriber.email} />
            </Section>
          )}

          {/* IDs Internos */}
          <Section title={t('internal_ids', 'Internal IDs')}>
            <Row label="Event ID" value={event.event_id} mono small />
            <Row label={t('subscription_ref', 'Sub Reference')} value={event.subscriptionId} mono />
          </Section>
          
          <div className="h-6 sm:hidden" />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Componentes Auxiliares ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{title}</h4>
      <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
        <div className="flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight, small }: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className="px-4 py-3.5 flex items-start justify-between gap-4 border-b border-tg-border/20 last:border-0 transition-colors hover:bg-tg-hint/5 active:bg-tg-hint/10">
      <span className="text-[13px] font-medium text-tg-hint shrink-0 mt-0.5">{label}</span>
      <span
        className={`text-right break-all leading-snug ${
          mono ? 'font-mono text-[12px]' : 'text-[14px]'
        } ${
          highlight ? 'text-tg-accent font-bold' : 'text-tg-text font-semibold'
        } ${
          small ? 'text-[11px]' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}