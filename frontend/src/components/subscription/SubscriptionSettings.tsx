import type { ProFeatures } from '../../services/subscriptionApi';

interface Props {
  features: ProFeatures;
  onAutoRenewToggle: () => void;
  onCancelChange: () => void;
  haptic?: any;
}

export default function SubscriptionSettings({ features, onAutoRenewToggle, onCancelChange, haptic }: Props) {
  const { subscription } = features;
  const tier = subscription.tier;
  const hasPendingChange = subscription.change?.status === 'pending';

  if (tier === 'free' && !hasPendingChange) return null;

  return (
    <section className="px-4">
      <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2.5 px-1">Suscripción</h2>
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-tg-border/20">
        {/* Auto Renew */}
        {tier !== 'free' && (
          <button
            className="w-full flex items-center gap-3.5 p-4 text-left active:bg-tg-surface/40 transition-colors"
            onClick={() => {
              haptic?.impactOccurred('light');
              onAutoRenewToggle();
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-tg-text">Auto-Renew</div>
              <div className="text-[12px] text-tg-hint mt-0.5">
                {subscription.auto_renew ? 'Se renovará automáticamente' : 'No se renovará al expirar'}
              </div>
            </div>
            <div
              className={`tm-toggle ${subscription.auto_renew ? 'on' : ''} ml-2 flex-shrink-0`}
              role="switch"
              aria-checked={subscription.auto_renew}
            />
          </button>
        )}

        {/* Pending Change */}
        {hasPendingChange && (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-amber-400">Cambio pendiente</div>
                <div className="text-[13px] text-tg-hint mt-1 leading-snug">
                  <span className="text-tg-text font-medium">{subscription.change!.changed_from}</span>
                  {' → '}
                  <span className="text-tg-text font-medium">{subscription.change!.new_plan}</span>
                  {subscription.change!.change_date && (
                    <span className="block text-[12px] mt-0.5 opacity-75">
                      {new Date(subscription.change!.change_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelChange(); }}
                  className="mt-2.5 flex items-center gap-1.5 text-[13px] text-red-400 font-semibold active:opacity-70 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  Cancelar cambio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
