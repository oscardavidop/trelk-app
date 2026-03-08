import { Inbox, AlertTriangle } from 'lucide-react';
import type { PaymentEventItem } from '../../services/paymentsApi';

const TIMELINE_COLORS: Record<string, string> = {
  'BILLING.SUBSCRIPTION.CREATED': 'bg-blue-500',
  'BILLING.SUBSCRIPTION.ACTIVATED': 'bg-emerald-500',
  'BILLING.SUBSCRIPTION.CANCELLED': 'bg-red-500',
  'BILLING.SUBSCRIPTION.SUSPENDED': 'bg-amber-500', // Cambiado a amber-500 para unificación
  'BILLING.SUBSCRIPTION.RE-ACTIVATED': 'bg-emerald-500',
  'BILLING.SUBSCRIPTION.EXPIRED': 'bg-zinc-500',
  'PAYMENT.SALE.COMPLETED': 'bg-emerald-500',
  'PAYMENT.SALE.DENIED': 'bg-red-500',
  'PAYMENT.SALE.REFUNDED': 'bg-amber-500',
  'PAYMENT.SALE.REVERSED': 'bg-amber-500',
};

const TIMELINE_LABELS: Record<string, string> = {
  'BILLING.SUBSCRIPTION.CREATED': 'Creada',
  'BILLING.SUBSCRIPTION.ACTIVATED': 'Activada',
  'BILLING.SUBSCRIPTION.CANCELLED': 'Cancelada',
  'BILLING.SUBSCRIPTION.SUSPENDED': 'Suspendida',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED': 'Reactivada',
  'BILLING.SUBSCRIPTION.EXPIRED': 'Expirada',
  'PAYMENT.SALE.COMPLETED': 'Pago completado',
  'PAYMENT.SALE.DENIED': 'Pago denegado',
  'PAYMENT.SALE.REFUNDED': 'Reembolso',
  'PAYMENT.SALE.REVERSED': 'Reversión',
};

interface EventsTimelineProps {
  events: PaymentEventItem[];
  loading: boolean;
  subscriptionId: string;
  onEventClick: (event: PaymentEventItem) => void;
}

export default function EventsTimeline({ events, loading, subscriptionId, onEventClick }: EventsTimelineProps) {
  
  // ── ESTADO: CARGANDO ──
  if (loading) {
    return (
      <div className="space-y-0 py-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse relative">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-white/10 shrink-0 mt-1.5" />
              {i < 3 && <div className="w-[2px] h-12 bg-white/5 mt-1" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="h-3.5 bg-white/10 rounded-full w-1/3 mb-2" />
              <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── ESTADO: VACÍO ──
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-4">
        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
          <Inbox size={24} className="text-tg-hint/40" />
        </div>
        <p className="text-[15px] font-bold text-tg-text">Sin eventos</p>
        <p className="text-[13px] text-tg-hint mt-1 leading-relaxed">No hay actividad para esta suscripción.</p>
        <p className="text-[11px] text-tg-hint/60 mt-3 font-mono bg-black/20 px-2 py-1 rounded-md">{subscriptionId}</p>
      </div>
    );
  }

  // ── TIMELINE ──
  return (
    <div className="py-2">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
        <span className="text-[11px] text-tg-hint/80 font-mono bg-black/20 px-2.5 py-1 rounded-md border border-white/5 truncate max-w-[70%]">
          {subscriptionId}
        </span>
        <span className="text-[12px] font-semibold text-tg-hint bg-white/[0.04] px-2.5 py-1 rounded-full">
          {events.length} eventos
        </span>
      </div>

      <div className="relative">
        {events.map((event, i) => {
          const isLast = i === events.length - 1;
          const dotColor = TIMELINE_COLORS[event.eventType] || 'bg-zinc-400';
          const label = TIMELINE_LABELS[event.eventType] || event.eventType.split('.').pop();
          
          const date = new Date(event.create_time || event.createdAt);
          const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
          
          const amount = event.resource?.amount?.total;
          const fee = event.resource?.transaction_fee?.value;

          return (
            <button
              key={event._id}
              onClick={() => onEventClick(event)}
              className="flex gap-4 w-full text-left group hover:bg-white/[0.02] active:bg-white/[0.04] -mx-3 px-3 py-1.5 rounded-2xl transition-colors relative"
            >
              {/* Línea vertical y punto */}
              <div className="flex flex-col items-center mt-1">
                <div className={`w-3 h-3 rounded-full ${dotColor} ring-[4px] ring-tg-secondary shrink-0 z-10 shadow-sm`} />
                {!isLast && <div className="w-[2px] flex-1 bg-white/10 -my-1 group-hover:bg-white/20 transition-colors" />}
              </div>

              {/* Contenido del evento */}
              <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-6 pt-0.5'}`}>
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Lado izquierdo (Info principal) */}
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-tg-text group-active:text-tg-accent transition-colors tracking-tight truncate">
                      {label}
                    </p>
                    <p className="text-[12px] font-medium text-tg-hint mt-0.5">
                      {dateStr} <span className="text-[10px] opacity-50 mx-0.5">•</span> {timeStr}
                    </p>
                    {event.summary && (
                      <p className="text-[12px] text-tg-hint/70 mt-1.5 leading-snug line-clamp-2">
                        {event.summary}
                      </p>
                    )}
                  </div>

                  {/* Lado derecho (Montos y Alertas) */}
                  <div className="flex flex-col items-end shrink-0 text-right">
                    {amount && (
                      <p className="text-[15px] font-extrabold text-tg-text tabular-nums tracking-tight">
                        ${amount}
                      </p>
                    )}
                    {fee && (
                      <p className="text-[10px] font-medium text-tg-hint mt-0.5">
                        Fee: ${fee}
                      </p>
                    )}
                    {event.invalid_signature && (
                      <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle size={10} className="text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Firma</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previsualización de Facturación (Si aplica) */}
                {event.billing_info?.next_billing_time && (
                  <div className="mt-3 rounded-[12px] bg-black/20 border border-white/5 px-3.5 py-2.5 flex flex-wrap gap-4 items-center">
                    {event.billing_info.last_payment && (
                      <div>
                        <p className="text-[10px] font-bold text-tg-hint/70 uppercase tracking-widest mb-0.5">Último Pago</p>
                        <p className="text-[13px] font-semibold text-tg-text tabular-nums">
                          ${event.billing_info.last_payment.amount.value} <span className="text-[11px] text-tg-hint">{event.billing_info.last_payment.amount.currency_code}</span>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-tg-hint/70 uppercase tracking-widest mb-0.5">Próximo Cobro</p>
                      <p className="text-[13px] font-bold text-tg-accent tabular-nums">
                        {new Date(event.billing_info.next_billing_time).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}