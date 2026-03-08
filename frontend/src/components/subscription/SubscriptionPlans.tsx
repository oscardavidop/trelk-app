import type { PlanTier } from '../../services/subscriptionApi';
import PlanComparison from '../PlanComparison';

interface Props {
  currentTier: PlanTier;
  pendingChange?: string;
  onSelect: (tier: PlanTier) => void;
}

export default function SubscriptionPlans({ currentTier, pendingChange, onSelect }: Props) {
  return (
    <section className="px-4 mt-2">
      <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2.5 px-1">Planes</h2>
      <PlanComparison
        currentTier={currentTier}
        pendingChange={pendingChange}
        onSelect={onSelect}
      />
    </section>
  );
}
