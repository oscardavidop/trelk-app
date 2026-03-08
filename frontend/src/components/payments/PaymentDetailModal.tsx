import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import type { PaymentEventItem } from '../../services/paymentsApi';

interface PaymentDetailModalProps {
  event: PaymentEventItem | null;
  onClose: () => void;
}

export default function PaymentDetailModal({ event, onClose }: PaymentDetailModalProps) {
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* ── Contenedor del Modal ── */}
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] bg-tg-bg rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl sm:animate-scale-in animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (Solo móvil) */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
        </div>

        {/* ── Header ── */}
        <div className="px-5 pt-2 pb-4 border-b border-tg-border/50 flex-shrink-0 bg-tg-bg/95 backdrop-blur-md z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-tg-text tracking-tight">Detalle del Evento</h3>
              <p className="text-[12px] font-mono text-tg-hint/80 mt-0.5 truncate max-w-[250px]">
                {event.event_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-tg-secondary flex items-center justify-center text-tg-hint hover:bg-tg-accent/10 hover:text-tg-accent active:scale-95 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Contenido Scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Alerta de Seguridad (Si aplica) */}
          {event.invalid_signature && (
            <div className="p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-amber-500">Firma inválida detectada</p>
                <p className="text-[12px] text-amber-500/80 mt-0.5 leading-snug">
                  La firma del webhook no pudo ser verificada.
                </p>
              </div>
            </div>
          )}

          {/* Tipo y Estado */}
          <Section title="Información General">
            <Row label="Tipo" value={event.eventType} mono />
            <Row 
              label="Fecha" 
              value={date.toLocaleString('es', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })} 
            />
            <Row label="Resumen" value={event.summary || '—'} />
            <Row label="Procesado" value={event.processed ? 'Sí' : 'No'} highlight={!event.processed} />
          </Section>

          {/* Detalles de Suscripción */}
          {isSubscription && event.resource && (
            <Section title="Suscripción">
              <Row label="ID" value={event.resource.id || '—'} mono />
              <Row label="Estado" value={event.resource.status || '—'} highlight />
              <Row label="Plan ID" value={event.resource.plan_id || '—'} mono />
              {event.resource.start_time && (
                <Row label="Inicio" value={new Date(event.resource.start_time).toLocaleDateString('es')} />
              )}
              {event.resource.status_update_time && (
                <Row label="Último cambio" value={new Date(event.resource.status_update_time).toLocaleString('es')} />
              )}
            </Section>
          )}

          {/* Detalles de Pago */}
          {isPayment && event.resource && (
            <Section title="Detalles del Pago">
              <Row label="Transaction ID" value={event.resource.id || '—'} mono />
              <Row label="Estado" value={event.resource.state || '—'} highlight />
              {event.resource.amount && (
                <Row
                  label="Monto"
                  value={`$${event.resource.amount.total} ${event.resource.amount.currency}`}
                  highlight
                />
              )}
              {event.resource.transaction_fee && (
                <Row
                  label="Fee PayPal"
                  value={`$${event.resource.transaction_fee.value} ${event.resource.transaction_fee.currency}`}
                />
              )}
              {event.resource.payment_mode && (
                <Row label="Modo" value={event.resource.payment_mode} />
              )}
              {event.resource.billing_agreement_id && (
                <Row label="Suscripción" value={event.resource.billing_agreement_id} mono />
              )}
            </Section>
          )}

          {/* Información de Facturación */}
          {event.billing_info && (
            <Section title="Facturación">
              {event.billing_info.last_payment && (
                <Row
                  label="Último pago"
                  value={`$${event.billing_info.last_payment.amount.value} ${event.billing_info.last_payment.amount.currency_code} — ${new Date(event.billing_info.last_payment.time).toLocaleDateString('es')}`}
                />
              )}
              {event.billing_info.next_billing_time && (
                <Row
                  label="Próximo cobro"
                  value={new Date(event.billing_info.next_billing_time).toLocaleDateString('es', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                  highlight
                />
              )}
              {event.billing_info.outstanding_balance && (
                <Row
                  label="Balance pendiente"
                  value={`$${event.billing_info.outstanding_balance.value} ${event.billing_info.outstanding_balance.currency_code}`}
                />
              )}
              <Row
                label="Pagos fallidos"
                value={String(event.billing_info.failed_payments_count ?? 0)}
                highlight={Number(event.billing_info.failed_payments_count) > 0}
              />
            </Section>
          )}

          {/* Pagador */}
          {event.subscriber && (
            <Section title="Pagador (Subscriber)">
              {event.subscriber.name && (
                <Row label="Nombre" value={`${event.subscriber.name.given_name} ${event.subscriber.name.surname}`} />
              )}
              <Row label="Payer ID" value={event.subscriber.payer_id} mono />
              <Row label="Email" value={event.subscriber.email} />
            </Section>
          )}

          {/* IDs Internos */}
          <Section title="Identificadores Internos">
            <Row label="Event ID" value={event.event_id} mono small />
            <Row label="Ref. Subscripción" value={event.subscriptionId} mono />
          </Section>
          
          <div className="h-4 sm:hidden" />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Componentes Auxiliares ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest pl-2">{title}</h4>
      <div className="rounded-[16px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm">
        <div className="divide-y divide-white/5">
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
    <div className="px-4 py-3.5 flex items-start justify-between gap-4 transition-colors hover:bg-tg-accent/5">
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