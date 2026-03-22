import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentsStore } from '../stores/payments';
import SubscriptionCard from '../components/payments/SubscriptionCard';
import PaymentsTable from '../components/payments/PaymentsTable';
import EventsTimeline from '../components/payments/EventsTimeline';
import PaymentDetailModal from '../components/payments/PaymentDetailModal';
import { Loader2, PieChart, History, CreditCard, Sparkles } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

const TABS = [
  { key: 'overview' as const, labelKey: 'overview', icon: PieChart },
  { key: 'history' as const, labelKey: 'history', icon: History },
  { key: 'subscriptions' as const, labelKey: 'subscription', icon: CreditCard },
] as const;

export default function PaymentsPage() {
  const store = usePaymentsStore();
  const { t } = useTranslation('payments');

  // 1. Extraemos las funciones para tener referencias estables
  const { 
    loadSummary, 
    loadSubscriptions, 
    loadHistory, 
    loadEvents, 
    setActiveTab, 
    cancel 
  } = store;

  // 2. Dependemos SOLO de las funciones, no de todo el store
  useEffect(() => {
    loadSummary();
    loadSubscriptions();
    loadHistory();
  }, [loadSummary, loadSubscriptions, loadHistory]);

  const handleViewEvents = useCallback((subId: string) => {
    loadEvents(subId);
    setActiveTab('subscriptions');
  }, [loadEvents, setActiveTab]);

  const handleCancel = useCallback((subId: string) => {
    // if (confirm(t('cancel_confirm', 'Are you sure you want to cancel this subscription?'))) {
      cancel(subId);
    // }
  }, [cancel, t]);

  return (
    <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto min-h-screen">
      
      <StickyHeader 
        title={t('title', 'Payments & Billing')} 
        subtitle={t('subtitle', 'Manage your subscriptions')}
        icon={
          <div className="w-[42px] h-[42px] rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
        }
      >{/* Tabs / Segmented Control */}
        <div className="px-5 mt-4 relative z-20 pb-2 w-full">
          {/* Pista del Segmented Control (Sin bordes duros, fondo sutil) */}
          <div className="flex p-1 bg-tg-hint/15 rounded-[14px] shadow-inner">
            {TABS.map((tab) => {
              const isActive = store.activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => store.setActiveTab(tab.key)}
                  className={`relative flex-1 py-2.5 px-2 rounded-[10px] text-[13px] font-bold transition-all duration-200 ease-out flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-tg-secondary text-tg-text shadow-[0_2px_8px_rgba(0,0,0,0.08)]' // 👈 Píldora activa sin borde, con sombra suave
                      : 'text-tg-hint hover:text-tg-text hover:bg-tg-hint/5 active:scale-95'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-tg-accent' : ''} />
                  <span className="tracking-wide capitalize truncate">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </StickyHeader>
      
      {/* Tab content */}
      <div className="px-5 py-4 animate-slide-up">
        {/* ═══ LOADING STATE ═══ */}
        {store.loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-tg-accent animate-spin" />
            <span className="text-[13px] font-medium text-tg-hint animate-pulse">{t('common:loading', 'Loading...')}</span>
          </div>
        )}

        {/* ═══ OVERVIEW TAB ═══ */}
        {!store.loading && store.activeTab === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            <SubscriptionCard
              subscription={store.activeSubscription}
              totalSpent={store.totalSpent}
              totalSubscriptions={store.totalSubscriptions}
              onCancel={handleCancel}
              cancelling={store.cancelling}
              onViewEvents={handleViewEvents}
            />

            {/* Payment method */}
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 p-5 shadow-sm">
              <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3.5 pl-1">{t('payment_method', 'Payment Method')}</h3>
              <div className="flex items-center gap-3.5">
                <div className="w-[46px] h-[46px] rounded-[14px] bg-[#003087]/10 border border-[#003087]/20 flex items-center justify-center shadow-sm">
                  {/* Icono PayPal */}
                  <svg className="w-6 h-4 opacity-90" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.237 4.001H4.087a.96.96 0 0 0-.949.812L0 25.795a.576.576 0 0 0 .57.664h3.888a.96.96 0 0 0 .949-.811l.848-5.375a.96.96 0 0 1 .949-.812h2.187c4.559 0 7.19-2.207 7.876-6.583.309-1.914.012-3.418-.883-4.471C15.391 4.89 14.04 4.001 12.237 4.001z" fill="#253B80" />
                    <path d="M37.063 4.001h-8.15a.96.96 0 0 0-.949.812l-3.138 19.982a.576.576 0 0 0 .57.664h4.141a.672.672 0 0 0 .664-.568l.891-5.618a.96.96 0 0 1 .949-.812h2.187c4.559 0 7.19-2.207 7.876-6.583.309-1.914.013-3.418-.882-4.471-.996-1.517-2.347-2.406-4.159-2.406z" fill="#179BD7" />
                    <path d="M61.559 9.782h-4.16a.578.578 0 0 0-.571.488l-.184 1.162-.29-.421c-.902-1.308-2.912-1.745-4.919-1.745-4.602 0-8.535 3.488-9.304 8.384-.4 2.441.168 4.776 1.561 6.405 1.279 1.498 3.106 2.122 5.281 2.122 3.734 0 5.804-2.4 5.804-2.4l-.186 1.163a.576.576 0 0 0 .57.664h3.749a.96.96 0 0 0 .949-.812l2.25-14.346a.576.576 0 0 0-.55-.664z" fill="#253B80" />
                    <path d="M86.385 9.782h-4.16a.578.578 0 0 0-.571.488l-.184 1.162-.29-.421c-.902-1.308-2.912-1.745-4.919-1.745-4.602 0-8.535 3.488-9.304 8.384-.4 2.441.168 4.776 1.561 6.405 1.279 1.498 3.106 2.122 5.281 2.122 3.734 0 5.804-2.4 5.804-2.4l-.186 1.163a.576.576 0 0 0 .57.664h3.749a.96.96 0 0 0 .949-.812l2.25-14.346a.576.576 0 0 0-.55-.664z" fill="#179BD7" />
                    <path d="M98.203 4.001h-4.175a.96.96 0 0 0-.817.455l-4.72 6.951-2.001-6.681a.961.961 0 0 0-.92-.725h-4.102a.577.577 0 0 0-.546.77l3.771 11.073-3.548 5.005a.576.576 0 0 0 .472.912h4.173a.96.96 0 0 0 .813-.449l11.388-16.431a.577.577 0 0 0-.788-.88z" fill="#253B80" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-tg-text leading-tight">PayPal</p>
                  <p className="text-[12px] font-medium text-tg-hint/80 truncate mt-0.5">
                    {store.activeSubscription?.paypal_payerId || t('no_method', 'No method linked')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            {store.totalSpent.length > 0 && (
              <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 p-5 shadow-sm">
                <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3.5 pl-1">{t('financial_summary', 'Financial Summary')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {store.totalSpent.map((s) => (
                    <div key={s.currency} className="bg-tg-hint/5 border border-tg-border/20 rounded-[14px] p-3.5 flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-tg-hint/70 uppercase tracking-wide mb-1">{t('total_paid', { currency: s.currency, defaultValue: `Total Paid (${s.currency})` })}</p>
                      <p className="text-[20px] font-black text-tg-text tracking-tight">${s.total.toFixed(2)}</p>
                      <p className="text-[11px] font-medium text-tg-hint mt-1">{t('transactions_count', { count: s.count, defaultValue: `${s.count} transactions` })}</p>
                    </div>
                  ))}
                  {store.activeSubscription && (
                    <div className="bg-tg-accent/5 border border-tg-accent/20 rounded-[14px] p-3.5 flex flex-col justify-center shadow-inner">
                      <p className="text-[11px] font-bold text-tg-accent/70 uppercase tracking-wide mb-1">{t('monthly_spend', 'Monthly Spend')}</p>
                      <p className="text-[20px] font-black text-tg-accent tracking-tight">
                        ${store.activeSubscription.amount}
                      </p>
                      <p className="text-[11px] font-medium text-tg-accent/70 mt-1">{t('per_month', { currency: store.activeSubscription.currency, defaultValue: `${store.activeSubscription.currency} / mo` })}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {!store.loading && store.activeTab === 'history' && (
          <div className="animate-fade-in">
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
          </div>
        )}

        {/* ═══ SUBSCRIPTIONS TAB ═══ */}
        {!store.loading && store.activeTab === 'subscriptions' && (
          <div className="space-y-5 animate-fade-in">
            {store.subscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-16 text-center">
                <div className="w-[64px] h-[64px] mx-auto mb-4 rounded-[20px] bg-tg-secondary border border-tg-border/40 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-8 h-8 text-tg-hint/40" />
                </div>
                <p className="text-[16px] font-bold text-tg-text mb-1">{t('no_subscriptions', 'No active subscriptions')}</p>
                <p className="text-[13px] font-medium text-tg-hint leading-relaxed max-w-[200px] mx-auto">{t('subscriptions_appear', 'Your active or past subscriptions will appear here.')}</p>
              </div>
            ) : (
              <>
                {/* Subscription cards list */}
                <div className="space-y-4">
                  {store.subscriptions.map((sub) => (
                    <SubscriptionCard
                      key={sub._id}
                      subscription={sub}
                      totalSpent={[]}
                      totalSubscriptions={0}
                      onCancel={sub.status === 'ACTIVE' ? handleCancel : undefined}
                      cancelling={store.cancelling}
                      onViewEvents={handleViewEvents}
                    />
                  ))}
                </div>

                {/* Events timeline for selected subscription */}
                {store.selectedSubId && (
                  <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 p-5 shadow-sm">
                    <h3 className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-3.5 pl-1">{t('events_timeline', 'Events Timeline')}</h3>
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
                    className="w-full py-3.5 rounded-[16px] bg-tg-hint/10 text-[14px] font-bold text-tg-text border border-tg-border/20 transition-transform active:scale-95 disabled:opacity-50 hover:bg-tg-hint/20"
                  >
                    {store.loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> {t('common:loading')}
                      </span>
                    ) : t('load_more', 'Load More')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <PaymentDetailModal
        event={store.detailEvent}
        onClose={() => store.setDetailEvent(null)}
      />
    </div>
  );
}