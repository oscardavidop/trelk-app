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
import { useTranslation } from 'react-i18next';
import type { PaymentEventItem } from '../../services/paymentsApi';

// ── Mapeo de Iconos por Tipo de Evento ──
function EventIcon({ type, className = 'w-4 h-4' }: { type: string; className?: string }) {
  if (type.includes('CREATED')) return <FileText className={className} strokeWidth={2.5} />;
  if (type.includes('ACTIVATED') || type.includes('RE-ACTIVATED')) return <PlayCircle className={className} strokeWidth={2.5} />;
  if (type.includes('CANCELLED')) return <XCircle className={className} strokeWidth={2.5} />;
  if (type.includes('SUSPENDED')) return <Clock className={className} strokeWidth={2.5} />;
  if (type.includes('EXPIRED')) return <Clock className={className} strokeWidth={2.5} />;
  if (type.includes('COMPLETED')) return <CheckCircle2 className={className} strokeWidth={2.5} />;
  if (type.includes('DENIED')) return <AlertCircle className={className} strokeWidth={2.5} />;
  if (type.includes('REFUNDED') || type.includes('REVERSED')) return <ArrowLeftRight className={className} strokeWidth={2.5} />;
  return <RefreshCw className={className} strokeWidth={2.5} />;
}

// ── Meta-datos de Eventos (Colores adaptables) ──
const EVENT_META_KEYS: Record<string, { labelKey: string; color: string; bg: string; border: string }> = {
  'BILLING.SUBSCRIPTION.CREATED': { labelKey: 'evt_sub_created', color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  'BILLING.SUBSCRIPTION.ACTIVATED': { labelKey: 'evt_sub_activated', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'BILLING.SUBSCRIPTION.CANCELLED': { labelKey: 'evt_sub_cancelled', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'BILLING.SUBSCRIPTION.SUSPENDED': { labelKey: 'evt_sub_suspended', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  'BILLING.SUBSCRIPTION.RE-ACTIVATED': { labelKey: 'evt_sub_reactivated', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'BILLING.SUBSCRIPTION.EXPIRED': { labelKey: 'evt_sub_expired', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  'PAYMENT.SALE.COMPLETED': { labelKey: 'evt_payment_completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'PAYMENT.SALE.DENIED': { labelKey: 'evt_payment_denied', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'PAYMENT.SALE.REFUNDED': { labelKey: 'evt_refund', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'PAYMENT.SALE.REVERSED': { labelKey: 'evt_reversal', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

const FILTER_OPTION_KEYS = [
  { value: '', labelKey: 'filter_all' },
  { value: 'BILLING.SUBSCRIPTION.CREATED', labelKey: 'filter_created' },
  { value: 'BILLING.SUBSCRIPTION.ACTIVATED', labelKey: 'filter_activated' },
  { value: 'PAYMENT.SALE.COMPLETED', labelKey: 'filter_payments' },
  { value: 'BILLING.SUBSCRIPTION.CANCELLED', labelKey: 'filter_cancelled' },
  { value: 'PAYMENT.SALE.DENIED', labelKey: 'filter_denied' },
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
  const { t } = useTranslation('payments');
  
  return (
    <div className="space-y-4">
      
      {/* ── Filter chips ── */}
      <div className="flex gap-2.5 overflow-x-auto w-full pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTER_OPTION_KEYS.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold transition-transform active:scale-95 border shadow-sm ${
                isActive
                  ? 'bg-tg-accent text-white border-tg-accent'
                  : 'bg-tg-bg text-tg-text border-tg-border/40 hover:bg-tg-hint/5'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex flex-col divide-y divide-tg-border/20">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="w-[42px] h-[42px] rounded-[12px] bg-tg-hint/10 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3.5 bg-tg-hint/10 rounded-full w-1/3" />
                  <div className="h-2.5 bg-tg-hint/5 rounded-full w-1/2" />
                </div>
                <div className="h-4 bg-tg-hint/10 rounded-full w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-5 bg-tg-secondary border border-tg-border/40 rounded-[24px] shadow-sm animate-fade-in">
          <div className="w-[64px] h-[64px] rounded-[20px] bg-tg-hint/10 flex items-center justify-center mb-4 shadow-inner">
            <Clock size={28} className="text-tg-hint/40" />
          </div>
          <p className="text-[17px] font-bold text-tg-text mb-1">{t('no_events', 'No events found')}</p>
          <p className="text-[13px] font-medium text-tg-hint leading-relaxed max-w-[240px] mx-auto">
            {filter === '' 
              ? t('events_will_appear', 'Your payment and subscription events will appear here.') 
              : t('no_events_match_filter', 'No events match the selected filter.')}
          </p>
        </div>
      )}

      {/* ── Events list (Estilo Menú iOS) ── */}
      {!loading && events.length > 0 && (
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm animate-slide-up">
          <div className="flex flex-col">
            {events.map((event) => {
              const meta = EVENT_META_KEYS[event.eventType] || { labelKey: event.eventType, color: 'text-tg-text', bg: 'bg-tg-hint/10', border: 'border-tg-border/30' };
              const amount = event.resource?.amount?.total;
              const currency = event.resource?.amount?.currency;
              const date = new Date(event.create_time || event.createdAt);
              const dateStr = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
              const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={event._id}
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-3.5 p-4 border-b border-tg-border/20 last:border-0 transition-colors hover:bg-tg-hint/5 active:bg-tg-hint/10 cursor-pointer group"
                >
                  {/* Icono del evento */}
                  <div className={`w-[42px] h-[42px] rounded-[12px] border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95 ${meta.bg} ${meta.border} ${meta.color}`}>
                    <EventIcon type={event.eventType} className="w-5 h-5" />
                  </div>

                  {/* Textos centrales */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-[15px] font-bold truncate leading-tight mb-1 ${meta.color}`}>
                      {t(meta.labelKey)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-tg-hint">{dateStr} · {timeStr}</span>
                      {event.subscriptionId && (
                        <>
                          <span className="text-[10px] text-tg-hint/40">•</span>
                          <span className="text-[11px] font-mono font-medium text-tg-hint/70 truncate max-w-[80px]">
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
                        <span className="text-[16px] font-black text-tg-text tabular-nums tracking-tight">${amount}</span>
                        <span className="text-[11px] font-bold text-tg-hint/80">{currency}</span>
                      </div>
                    ) : (
                      <span className="text-[14px] font-bold text-tg-hint/40">—</span>
                    )}

                    {event.invalid_signature && (
                      <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-[6px] bg-red-500/10 border border-red-500/20 shadow-sm">
                        <AlertCircle size={10} className="text-red-500" strokeWidth={2.5} />
                        <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-wider">Invalid</span>
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
          className="w-full py-3.5 rounded-[16px] bg-tg-hint/10 border border-tg-border/20 text-[14px] font-bold text-tg-text transition-transform active:scale-95 disabled:opacity-50 hover:bg-tg-hint/20 mt-4 shadow-sm"
        >
          {loadingMore ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-tg-hint" strokeWidth={2.5} />
              <span className="text-tg-hint">{t('loading_events', 'Loading events...')}</span>
            </span>
          ) : (
            t('load_more', 'Load More')
          )}
        </button>
      )}
    </div>
  );
}