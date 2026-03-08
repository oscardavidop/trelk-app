import type { PlanTier } from '../../services/subscriptionApi';
import type { ProFeatures } from '../../services/subscriptionApi';

const TIER_META: Record<PlanTier, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  free: {
    label: 'Free', color: '#9ca3af', gradient: 'from-gray-600/30 to-gray-800/10',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  },
  pro: {
    label: 'Pro', color: '#f5a623', gradient: 'from-amber-500/30 to-orange-600/10',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z" /><path d="M3 20h18" /></svg>,
  },
  ultra: {
    label: 'Ultra', color: '#a855f7', gradient: 'from-purple-500/30 to-pink-600/10',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5H18l-3.7 2.8 1.4 4.5L12 12l-3.7 2.8 1.4-4.5L6 7.5h4.5z" /><path d="M5 19l2-5" /><path d="M19 19l-2-5" /></svg>,
  },
};

function timeUntil(isoDate?: string): string {
  if (!isoDate) return 'Sin expiración';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h restantes`;
  return `${hours}h restantes`;
}

interface Props {
  features: ProFeatures;
}

export default function SubscriptionHero({ features }: Props) {
  const { subscription, performance, support } = features;
  const tier = subscription.tier;
  const meta = TIER_META[tier];

  return (
    <div className="mx-4 mt-4 animate-scale-in">
      <div className={`relative rounded-[22px] overflow-hidden bg-gradient-to-br ${meta.gradient} p-5 ring-1 ring-white/[0.08]`}>
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: meta.color }}
        />

        <div className="relative z-10">
          {/* Plan info */}
          <div className="flex items-center gap-3.5 mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}
            >
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-bold text-tg-text tracking-tight">Plan {meta.label}</div>
              <div className="text-[13px] text-tg-hint flex items-center gap-1.5 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {tier === 'free' ? 'Sin expiración' : timeUntil(subscription.expires_at)}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Prioridad', value: performance.queue_priority },
              { label: 'Velocidad', value: `${performance.response_speed_multiplier}x` },
              { label: 'Soporte', value: support.priority },
            ].map((s) => (
              <div key={s.label} className="bg-black/15 backdrop-blur-sm rounded-2xl py-2.5 px-2 text-center border border-white/[0.04]">
                <div className="text-[11px] text-tg-hint/70 font-medium mb-0.5">{s.label}</div>
                <div className="text-[13px] font-bold text-white capitalize">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TIER_META, timeUntil };
