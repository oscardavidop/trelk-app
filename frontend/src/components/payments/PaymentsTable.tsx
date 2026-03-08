import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  ArrowLeftRight, 
  PlayCircle,
  FileText
} from 'lucide-react';
import type { PaymentEventItem } from '../../services/paymentsApi';

// ── Mapeo de Iconos por Tipo de Evento ──
function EventIcon({ type, className = 'w-4 h-4' }: { type: string; className?: string }) {
  if (type.includes('CREATED')) return <FileText className={className} />;
  if (type.includes('ACTIVATED') || type.includes('RE-ACTIVATED')) return <PlayCircle className={className} />;
  if (type.includes('CANCELLED')) return <XCircle className={className} />;
  if (type.includes('SUSPENDED')) return <Clock className={className} />;
  if (type.includes('EXPIRED')) return <Clock className={className} />;
  if (type.includes('COMPLETED')) return <CheckCircle2 className={className} />;
  if (type.includes('DENIED')) return <AlertCircle className={className} />;
  if (type.includes('REFUNDED') || type.includes('REVERSED')) return <ArrowLeftRight className={className} />;
  return <RefreshCw className={className} />;
}

// ── Meta-datos de Eventos ──
const EVENT_META: Record<string, { label: string; color: string }> = {
  'BILLING.SUBSCRIPTION.CREATED': { label: 'Suscripción Creada', color: 'text-blue-400' },
  'BILLING.SUBSCRIPTION.ACTIVATED': { label: 'Suscripción Activada', color: 'text-emerald-400' },
  'BILLING.SUBSCRIPTION.CANCELLED': { label: 'Suscripción Cancelada', color: 'text-red-400' },
  'BILLING.SUBSCRIPTION.SUSPENDED': { label: 'Suscripción Suspendida', color: 'text-amber-500' },
  'BILLING.SUBSCRIPTION.RE-ACTIVATED': { label: 'Suscripción Reactivada', color: 'text-emerald-400' },
  'BILLING.SUBSCRIPTION.EXPIRED': { label: 'Suscripción Expirada', color: 'text-zinc-400' },
  'PAYMENT.SALE.COMPLETED': { label: 'Pago Completado', color: 'text-emerald-400' },
  'PAYMENT.SALE.DENIED': { label: 'Pago Denegado', color: 'text-red-400' },
  'PAYMENT.SALE.REFUNDED': { label: 'Reembolso', color: 'text-amber-500' },
  'PAYMENT.SALE.REVERSED': { label: 'Reversión', color: 'text-amber-500' },
};

const FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'BILLING.SUBSCRIPTION.CREATED', label: 'Creadas' },
  { value: 'BILLING.SUBSCRIPTION.ACTIVATED', label: 'Activadas' },
  { value: 'PAYMENT.SALE.COMPLETED', label: 'Pagos' },
  { value: 'BILLING.SUBSCRIPTION.CANCELLED', label: 'Canceladas' },
  { value: 'PAYMENT.SALE.DENIED', label: 'Denegados' },
];

interface PaymentsTableProps {
  events: PaymentEventItem[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onEventClick: (event: PaymentEventItem) => void;
  filter: string;
  onFilterChange: (type: string) => void;
}

export default function PaymentsTable({
  events, loading, hasMore, loadingMore, onLoadMore, onEventClick, filter, onFilterChange,
}: PaymentsTableProps) {
  return (
    <div className="space-y-4">
      
      {/* ── Filter chips ── */}
      <div className="flex gap-2 overflow-x-auto w-full pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 border ${
                isActive
                  ? 'bg-tg-accent text-white border-tg-accent shadow-md'
                  : 'bg-tg-secondary text-tg-text border-white/[0.04] hover:brightness-110'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-lg">
          <div className="divide-y divide-tg-border/20">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-[12px] bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded-full w-1/3" />
                  <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
                </div>
                <div className="h-4 bg-white/10 rounded-full w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-tg-secondary flex items-center justify-center mb-4 border border-white/[0.05]">
            <Clock size={28} className="text-tg-hint/40" />
          </div>
          <p className="text-[16px] font-bold text-tg-text">No hay eventos</p>
          <p className="text-[13px] text-tg-hint mt-2 leading-relaxed">
            {filter === '' 
              ? 'Los eventos y transacciones aparecerán aquí' 
              : 'No hay eventos que coincidan con este filtro'}
          </p>
        </div>
      )}

      {/* ── Events list (Estilo Menú iOS) ── */}
      {!loading && events.length > 0 && (
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-lg animate-fade-in">
          <div className="divide-y divide-tg-border/20">
            {events.map((event) => {
              const meta = EVENT_META[event.eventType] || { label: event.eventType, color: 'text-tg-text' };
              const amount = event.resource?.amount?.total;
              const currency = event.resource?.amount?.currency;
              const date = new Date(event.create_time || event.createdAt);
              const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
              const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={event._id}
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-3.5 p-4 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] cursor-pointer"
                >
                  {/* Icono del evento */}
                  <div className={`w-10 h-10 rounded-[12px] bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0 ${meta.color}`}>
                    <EventIcon type={event.eventType} className="w-5 h-5" />
                  </div>

                  {/* Textos centrales */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold tracking-tight truncate ${meta.color}`}>
                      {meta.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12px] font-medium text-tg-hint/80">{dateStr} · {timeStr}</span>
                      {event.subscriptionId && (
                        <>
                          <span className="text-[10px] text-tg-hint/40">•</span>
                          <span className="text-[11px] font-mono text-tg-hint/70 truncate max-w-[80px]">
                            {event.subscriptionId.slice(-6)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lado derecho: Monto y Alertas */}
                  <div className="flex flex-col items-end shrink-0">
                    {amount ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-[15px] font-bold text-tg-text tabular-nums tracking-tight">${amount}</span>
                        <span className="text-[11px] font-semibold text-tg-hint/80">{currency}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] font-medium text-tg-hint/50">—</span>
                    )}

                    {event.invalid_signature && (
                      <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle size={10} className="text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Firma</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Load more button ── */}
      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-3.5 rounded-2xl bg-tg-secondary border border-tg-border/50 text-[14px] font-semibold text-tg-text transition-all active:scale-[0.98] active:bg-tg-surface disabled:opacity-50 mt-2"
        >
          {loadingMore ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-tg-hint" />
              <span className="text-tg-hint">Cargando eventos...</span>
            </span>
          ) : (
            'Cargar más historial'
          )}
        </button>
      )}
    </div>
  );
}