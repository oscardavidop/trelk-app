import { useEffect, useCallback } from 'react';
import { usePaymentsStore } from '../stores/payments';
import SubscriptionCard from '../components/payments/SubscriptionCard';
import PaymentsTable from '../components/payments/PaymentsTable';
import EventsTimeline from '../components/payments/EventsTimeline';
import PaymentDetailModal from '../components/payments/PaymentDetailModal';
import { Loader2 } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

const TAB_ICONS = {
  overview: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  history: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  subscriptions: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
} as const;

const TABS = [
  { key: 'overview' as const, label: 'Resumen' },
  { key: 'history' as const, label: 'Historial' },
  { key: 'subscriptions' as const, label: 'Suscripción' },
] as const;

export default function PaymentsPage() {
  const store = usePaymentsStore();



  useEffect(() => {
    store.loadSummary();
    store.loadSubscriptions();
    store.loadHistory();
  }, []);

  const handleViewEvents = useCallback((subId: string) => {
    store.loadEvents(subId);
    store.setActiveTab('subscriptions');
  }, []);

  const handleCancel = useCallback((subId: string) => {
    if (confirm('¿Estás seguro de cancelar tu suscripción?')) {
      store.cancel(subId);
    }
  }, []);

  return (
    <div className="min-h-screen pb-6">
      <StickyHeader title="Pagos" subtitle="Gestiona tu suscripción y revisa tu historial">

        {/* Tabs */}
        <div className="px-4 relative z-20 max-w-md mx-auto mt-4">
          <div className="flex p-1 bg-tg-secondary border border-tg-border/50 rounded-full shadow-sm gap-0.5">
            {TABS.map((tab) => {
              const isActive = store.activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => store.setActiveTab(tab.key)}
                  className={`relative flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ease-out flex items-center justify-center gap-1.5 ${isActive
                    ? 'bg-tg-accent text-white shadow-sm'
                    : 'text-tg-hint hover:text-tg-text/90 hover:bg-tg-surface/40 active:scale-95'
                    }`}
                >
                  {/* icon */}
                  {TAB_ICONS[tab.key]}
                  <span className="tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        </StickyHeader>
     
      {/* Tab content */}
      <div className="px-4 py-4">
        {/* ═══ OVERVIEW TAB ═══ */}
        {
          store.loading && (
            <div className="space-y-4 align-center justify-center flex-col flex py-20">
              <Loader2 className="w-8 h-8 mx-auto text-tg-hint animate-spin" />
            </div>
          ) ||
          (
            store.activeTab === 'overview' && (
              <div className="space-y-4">
                <SubscriptionCard
                  subscription={store.activeSubscription}
                  totalSpent={store.totalSpent}
                  totalSubscriptions={store.totalSubscriptions}
                  onCancel={handleCancel}
                  cancelling={store.cancelling}
                  onViewEvents={handleViewEvents}
                />

                {/* Payment method */}
                <div className="rounded-2xl bg-tg-section p-4">
                  <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3">Método de pago</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#003087]/15 flex items-center justify-center">
                      <svg className="w-6 h-3.5" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.237 4.001H4.087a.96.96 0 0 0-.949.812L0 25.795a.576.576 0 0 0 .57.664h3.888a.96.96 0 0 0 .949-.811l.848-5.375a.96.96 0 0 1 .949-.812h2.187c4.559 0 7.19-2.207 7.876-6.583.309-1.914.012-3.418-.883-4.471C15.391 4.89 14.04 4.001 12.237 4.001z" fill="#253B80" />
                        <path d="M37.063 4.001h-8.15a.96.96 0 0 0-.949.812l-3.138 19.982a.576.576 0 0 0 .57.664h4.141a.672.672 0 0 0 .664-.568l.891-5.618a.96.96 0 0 1 .949-.812h2.187c4.559 0 7.19-2.207 7.876-6.583.309-1.914.013-3.418-.882-4.471-.996-1.517-2.347-2.406-4.159-2.406z" fill="#179BD7" />
                        <path d="M61.559 9.782h-4.16a.578.578 0 0 0-.571.488l-.184 1.162-.29-.421c-.902-1.308-2.912-1.745-4.919-1.745-4.602 0-8.535 3.488-9.304 8.384-.4 2.441.168 4.776 1.561 6.405 1.279 1.498 3.106 2.122 5.281 2.122 3.734 0 5.804-2.4 5.804-2.4l-.186 1.163a.576.576 0 0 0 .57.664h3.749a.96.96 0 0 0 .949-.812l2.25-14.346a.576.576 0 0 0-.55-.664z" fill="#253B80" />
                        <path d="M86.385 9.782h-4.16a.578.578 0 0 0-.571.488l-.184 1.162-.29-.421c-.902-1.308-2.912-1.745-4.919-1.745-4.602 0-8.535 3.488-9.304 8.384-.4 2.441.168 4.776 1.561 6.405 1.279 1.498 3.106 2.122 5.281 2.122 3.734 0 5.804-2.4 5.804-2.4l-.186 1.163a.576.576 0 0 0 .57.664h3.749a.96.96 0 0 0 .949-.812l2.25-14.346a.576.576 0 0 0-.55-.664z" fill="#179BD7" />
                        <path d="M98.203 4.001h-4.175a.96.96 0 0 0-.817.455l-4.72 6.951-2.001-6.681a.961.961 0 0 0-.92-.725h-4.102a.577.577 0 0 0-.546.77l3.771 11.073-3.548 5.005a.576.576 0 0 0 .472.912h4.173a.96.96 0 0 0 .813-.449l11.388-16.431a.577.577 0 0 0-.788-.88z" fill="#253B80" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tg-text">PayPal</p>
                      <p className="text-[11px] text-tg-hint">
                        {store.activeSubscription?.paypal_payerId || 'Sin método vinculado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                {store.totalSpent.length > 0 && (
                  <div className="rounded-2xl bg-tg-section p-4">
                    <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3">Resumen financiero</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {store.totalSpent.map((s) => (
                        <div key={s.currency} className="bg-tg-surface/50 rounded-xl p-3">
                          <p className="text-[10px] text-tg-hint mb-1">Total pagado ({s.currency})</p>
                          <p className="text-xl font-bold text-tg-text">${s.total.toFixed(2)}</p>
                          <p className="text-[10px] text-tg-hint mt-0.5">{s.count} transacciones</p>
                        </div>
                      ))}
                      {store.activeSubscription && (
                        <div className="bg-tg-surface/50 rounded-xl p-3">
                          <p className="text-[10px] text-tg-hint mb-1">Gasto mensual</p>
                          <p className="text-xl font-bold text-tg-accent">
                            ${store.activeSubscription.amount}
                          </p>
                          <p className="text-[10px] text-tg-hint mt-0.5">{store.activeSubscription.currency}/mes</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          ) || store.activeTab === 'history' && (
            <PaymentsTable
              events={store.history}
              loading={store.loading}
              hasMore={store.historyHasMore}
              loadingMore={store.loadingMore}
              onLoadMore={store.loadMoreHistory}
              onEventClick={store.setDetailEvent}
              filter={store.historyFilter}
              onFilterChange={store.setHistoryFilter}
            />
          ) || store.activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {store.loading && !store.subscriptions.length && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-tg-section p-5 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tg-surface/50" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-tg-surface/50 rounded w-1/3" />
                          <div className="h-2.5 bg-tg-surface/30 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!store.loading && store.subscriptions.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-tg-surface/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-tg-hint/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-tg-hint">No hay suscripciones</p>
                  <p className="text-[11px] text-tg-hint/50 mt-1">Las suscripciones apareceran aqui</p>
                </div>
              )}

              {/* Subscription cards list */}
              {store.subscriptions.map((sub) => (
                <div key={sub._id} className="space-y-0">
                  <SubscriptionCard
                    subscription={sub}
                    totalSpent={[]}
                    totalSubscriptions={0}
                    onCancel={sub.status === 'ACTIVE' ? handleCancel : undefined}
                    cancelling={store.cancelling}
                    onViewEvents={handleViewEvents}
                  />
                </div>
              ))}

              {/* Events timeline for selected subscription */}
              {store.selectedSubId && (
                <div className="rounded-2xl bg-tg-section p-4">
                  <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3">Timeline de eventos</h3>
                  <EventsTimeline
                    events={store.events}
                    loading={store.eventsLoading}
                    subscriptionId={store.selectedSubId}
                    onEventClick={store.setDetailEvent}
                  />
                </div>
              )}

              {/* Load more subscriptions */}
              {store.subsHasMore && (
                <button
                  onClick={store.loadMoreSubscriptions}
                  disabled={store.loadingMore}
                  className="w-full py-3 rounded-xl bg-tg-surface/50 text-sm text-tg-hint font-medium transition-colors active:bg-tg-surface disabled:opacity-50"
                >
                  {store.loadingMore ? 'Cargando...' : 'Cargar más suscripciones'}
                </button>
              )}
            </div>
          )
        }
      </div>

      {/* Detail modal */}
      <PaymentDetailModal
        event={store.detailEvent}
        onClose={() => store.setDetailEvent(null)}
      />
    </div>
  );
}
