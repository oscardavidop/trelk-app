import { useTranslation } from 'react-i18next';
import { Crown, Zap, Sparkles, Check, X, Loader2 } from 'lucide-react';
import type { PayPalPlan, RealSubStatus } from '../services/subscriptionApi';


type PlanTier = 'free' | 'pro' | 'ultra';

interface Plan {
  tier: PlanTier;
  name: string;
  price: string;
  icon: typeof Crown;
  color: string;
  gradient: string;
  features: { labelKey: string; included: boolean }[];
  highlightKeys: string[];
}

// ── Datos sincronizados con TIER_META de SubscriptionHero ──
const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    icon: Zap,
    color: '#9ca3af',
    gradient: 'from-gray-500/10 to-gray-800/5',
    highlightKeys: ['plan_free_hl_downloads', 'plan_free_hl_ai', 'plan_free_hl_files'],
    features: [
      { labelKey: 'feat_daily_downloads', included: true },
      { labelKey: 'feat_basic_ai', included: true },
      { labelKey: 'feat_qr', included: true },
      { labelKey: 'feat_premium_ai', included: false },
      { labelKey: 'feat_custom_commands', included: false },
      { labelKey: 'feat_high_priority', included: false },
      { labelKey: 'feat_priority_support', included: false },
      { labelKey: 'feat_live_chat', included: false },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$4.99',
    icon: Crown,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-orange-600/5',
    highlightKeys: ['plan_pro_hl_downloads', 'plan_pro_hl_ai', 'plan_pro_hl_files', 'plan_pro_hl_speed'],
    features: [
      { labelKey: 'feat_pro_downloads', included: true },
      { labelKey: 'feat_pro_ai', included: true },
      { labelKey: 'feat_pro_premium_ai', included: true },
      { labelKey: 'feat_pro_qr', included: true },
      { labelKey: 'feat_pro_commands', included: true },
      { labelKey: 'feat_pro_queue', included: true },
      { labelKey: 'feat_pro_support', included: true },
      { labelKey: 'feat_live_chat', included: true },
    ],
  },
  {
    tier: 'ultra',
    name: 'Ultra',
    price: '$14.99',
    icon: Sparkles,
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-fuchsia-600/5',
    highlightKeys: ['plan_ultra_hl_downloads', 'plan_ultra_hl_ai', 'plan_ultra_hl_files', 'plan_ultra_hl_speed'],
    features: [
      { labelKey: 'feat_ultra_downloads', included: true },
      { labelKey: 'feat_ultra_ai', included: true },
      { labelKey: 'feat_ultra_premium_ai', included: true },
      { labelKey: 'feat_ultra_qr', included: true },
      { labelKey: 'feat_ultra_commands', included: true },
      { labelKey: 'feat_ultra_queue', included: true },
      { labelKey: 'feat_ultra_support', included: true },
      { labelKey: 'feat_ultra_chat', included: true },
    ],
  },
];

interface PlanComparisonProps {
  currentTier: PlanTier;
  pendingChange?: string;
  onSelect: (tier: PlanTier) => void;
  // ── Real PayPal ──
  realStatus?: RealSubStatus;
  realSubscriptionId?: string | null;
  realPlans?: PayPalPlan[];
  onRealCheckout?: (planId: string) => void;
  onRealRevise?: (subscriptionId: string, planId: string) => void;
  actionLoading?: boolean;
}

export default function PlanComparison({
  currentTier,
  pendingChange,
  onSelect,
  realStatus,
  realSubscriptionId,
  realPlans = [],
  onRealCheckout,
  onRealRevise,
  actionLoading,
}: PlanComparisonProps) {
  const { t } = useTranslation('subscription');

  // Map real backend plans by normalised tier name (e.g. "pro" → PayPalPlan)
  const realPlanMap = new Map<string, PayPalPlan>(
    realPlans.map((p) => [p.name.toLowerCase(), p]),
  );

  // Decide if we should show real PayPal CTA instead of local plan-change CTA
  const useRealPayPal = (realStatus != null) && (onRealCheckout != null || onRealRevise != null);
  const isRealActive = realStatus === 'ACTIVE';
  const isRealPending = realStatus === 'PENDING';
  
  return (
    <div className="space-y-4">
      {PLANS.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = currentTier === plan.tier;
        const isPending = pendingChange === plan.tier;

        return (
          <div
            key={plan.tier}
            className={`relative rounded-[24px] overflow-hidden transition-all duration-300 bg-tg-secondary ${
              isCurrent
                ? 'border-[2px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
                : 'border border-tg-border/40 shadow-sm'
            }`}
            style={{ 
              borderColor: isCurrent ? plan.color : undefined 
            }}
          >
            {/* ── Header del Plan ── */}
            <div className={`relative p-5 pb-4 bg-gradient-to-br ${plan.gradient} border-b border-tg-border/20`}>
              {/* Brillo decorativo */}
              <div 
                className="absolute top-0 right-0 w-[150px] h-[150px] rounded-full blur-[40px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/4"
                style={{ background: plan.color }}
              />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center shadow-sm backdrop-blur-md"
                    style={{ background: `${plan.color}15`, border: `1px solid ${plan.color}30` }}
                  >
                    <Icon className="w-6 h-6 drop-shadow-sm" style={{ color: plan.color }} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[20px] font-bold text-tg-text leading-tight">{plan.name}</span>
                      
                      {/* Badges */}
                      {isCurrent && (
                        <span className="text-[9px] bg-tg-accent/10 text-tg-accent border border-tg-accent/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {t('plan_current', 'Current')}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {t('plan_pending', 'Pending')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-[16px] font-bold text-tg-text">{plan.price}</span>
                      {plan.price !== '$0' && (
                        <span className="text-[13px] font-medium text-tg-hint">/{t('per_month', 'mo')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lista de Características ── */}
            <div className="p-5 space-y-3.5">
              {plan.features.map((f) => (
                <div key={f.labelKey} className="flex items-center gap-3">
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 ${f.included ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-tg-hint/10 border border-tg-border/30'}`}>
                    {f.included ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} />
                    ) : (
                      <X className="w-3.5 h-3.5 text-tg-hint/40" strokeWidth={2.5} />
                    )}
                  </div>
                  <span
                    className={`text-[14px] leading-tight ${
                      f.included ? 'text-tg-text font-medium' : 'text-tg-hint/50'
                    }`}
                  >
                    {t(f.labelKey)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Botón CTA ── */}
            {!isCurrent && (
              <div className="px-5 pb-5 pt-1">
                {(() => {
                  const realPlan = realPlanMap.get(plan.tier);
                  const hasRealPlan = !!realPlan;

                  // Pending state (waiting for PayPal webhook)
                  if (isRealPending && hasRealPlan) {
                    return (
                      <button disabled className="w-full py-3.5 rounded-[16px] text-[15px] font-bold flex items-center justify-center gap-2 opacity-60" style={{ background: plan.color, color: '#fff' }}>
                        <Loader2 size={16} className="animate-spin" />
                        {t('plan_activating', 'Activating...')}
                      </button>
                    );
                  }

                  // Real PayPal flow (ACTIVE user revises plan, FREE user checkouts)
                  if (useRealPayPal && hasRealPlan) {
                    const label = isRealActive
                      ? (PLANS.findIndex(p => p.tier === plan.tier) > PLANS.findIndex(p => p.tier === currentTier)
                          ? t('plan_upgrade_to', { name: plan.name, defaultValue: `Upgrade to ${plan.name}` })
                          : t('plan_change_to', { name: plan.name, defaultValue: `Change to ${plan.name}` }))
                      : t('plan_subscribe', { name: plan.name, defaultValue: `Subscribe – ${realPlan.currency} ${realPlan.price}/mo` });

                    return (
                      <button
                        onClick={() => {
                          if (isRealActive && realSubscriptionId && onRealRevise) {
                            onRealRevise(realSubscriptionId, realPlan.plan_id);
                          } else if (onRealCheckout) {
                            onRealCheckout(realPlan.plan_id);
                          }
                        }}
                        disabled={actionLoading || isPending}
                        className="w-full py-3.5 rounded-[16px] text-[15px] font-bold transition-transform duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        style={{ background: plan.color, color: '#fff' }}
                      >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {label}
                        {hasRealPlan && !isRealActive && (
                          <span className="text-white/70 text-[12px] font-medium ml-1">
                            {realPlan.currency} {realPlan.price}/mo
                          </span>
                        )}
                      </button>
                    );
                  }

                  // Fallback: local plan-change (legacy)
                  return (
                    <button
                      onClick={() => onSelect(plan.tier)}
                      disabled={isPending}
                      className="w-full py-3.5 rounded-[16px] text-[15px] font-bold transition-transform duration-200 active:scale-[0.98] flex items-center justify-center shadow-sm"
                      style={{ background: isPending ? 'var(--tg-hint)' : plan.color, color: '#fff', opacity: isPending ? 0.3 : 1 }}
                    >
                      {isPending
                        ? t('plan_change_in_progress', 'Change in progress')
                        : currentTier === 'free' || PLANS.findIndex(p => p.tier === plan.tier) > PLANS.findIndex(p => p.tier === currentTier)
                          ? t('plan_upgrade_to', { name: plan.name, defaultValue: `Upgrade to ${plan.name}` })
                          : t('plan_change_to', { name: plan.name, defaultValue: `Change to ${plan.name}` })}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}