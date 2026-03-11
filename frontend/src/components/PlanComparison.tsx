import { useTranslation } from 'react-i18next';
import type { PlanTier } from '../services/subscriptionApi';
import { Crown, Zap, Sparkles, Check, X } from 'lucide-react';

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

// ── Datos actualizados para coincidir con TIER_META ──
const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    icon: Zap,
    color: '#9ca3af',
    gradient: 'from-gray-600/30 to-gray-800/10',
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
    color: '#f5a623',
    gradient: 'from-amber-500/30 to-orange-600/10',
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
    color: '#a855f7',
    gradient: 'from-purple-500/30 to-pink-600/10',
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
}

export default function PlanComparison({ currentTier, pendingChange, onSelect }: PlanComparisonProps) {
  const { t } = useTranslation('subscription');
  return (
    <div className="space-y-4 mx-4">
      {PLANS.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = currentTier === plan.tier;
        const isPending = pendingChange === plan.tier;

        return (
          <div
            key={plan.tier}
            className={`relative rounded-[24px] overflow-hidden transition-all duration-300 bg-tg-secondary ${
              isCurrent
                ? 'border border-tg-accent shadow-[0_0_20px_rgba(var(--tg-accent-rgb),0.1)]'
                : 'border border-tg-border/20'
            }`}
          >
            {/* Header del Plan con Gradiente */}
            <div className={`relative p-5 pb-4 bg-gradient-to-br ${plan.gradient}`}>
              {/* Brillo decorativo */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/4"
                style={{ background: plan.color }}
              />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center border border-tg-border/20 shadow-inner backdrop-blur-sm"
                    style={{ background: `${plan.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="text-[18px] font-bold text-tg-text ">{plan.name}</span>
                      
                      {/* Badges estilo Premium */}
                      {isCurrent && (
                        <span className="text-[9px] bg-tg-accent/10 text-tg-accent border border-tg-accent/20 px-2 py-0.5 rounded-full font-bold uppercase ">
                          {t('plan_current')}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase ">
                          {t('plan_pending')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[15px] font-semibold text-tg-text">{plan.price}</span>
                      <span className="text-[13px] text-tg-hint font-medium">/{t('per_month')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Píldoras de características destacadas */}
              <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                {plan.highlightKeys.map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-medium bg-tg-surface/60 border border-tg-border/20 text-tg-text/85 px-2.5 py-1 rounded-lg backdrop-blur-md"
                  >
                    {t(h)}
                  </span>
                ))}
              </div>
            </div>

            {/* Lista de Características */}
            <div className="p-5 space-y-3.5">
              {plan.features.map((f) => (
                <div key={f.labelKey} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${f.included ? 'bg-emerald-500/10' : ''}`}>
                    {f.included ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-tg-hint/30" />
                    )}
                  </div>
                  <span
                    className={`text-[14px] ${
                      f.included ? 'text-tg-text font-medium' : 'text-tg-hint/40'
                    }`}
                  >
                    {t(f.labelKey)}
                  </span>
                </div>
              ))}
            </div>

            {/* Botón CTA */}
            {!isCurrent && (
              <div className="px-5 pb-5 pt-1">
                <button
                  onClick={() => onSelect(plan.tier)}
                  disabled={isPending}
                  className="w-full py-3 rounded-[14px] text-[15px] font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center shadow-lg"
                  style={{
                    background: isPending ? 'rgba(255,255,255,0.04)' : plan.color,
                    color: isPending ? 'var(--tg-hint)' : '#fff',
                    border: isPending ? '1px solid rgba(255,255,255,0.05)' : 'none'
                  }}
                >
                  {isPending
                    ? t('plan_change_in_progress')
                    : currentTier === 'free' || PLANS.findIndex(p => p.tier === plan.tier) > PLANS.findIndex(p => p.tier === currentTier)
                      ? t('plan_upgrade_to', { name: plan.name })
                      : t('plan_change_to', { name: plan.name })}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}