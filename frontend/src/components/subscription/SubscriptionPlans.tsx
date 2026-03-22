import { useTranslation } from 'react-i18next';
import type { PlanTier } from '../../services/subscriptionApi';
import PlanComparison from '../PlanComparison';

interface Props {
  currentTier: PlanTier;
  pendingChange?: string;
  onSelect: (tier: PlanTier) => void;
}

export default function SubscriptionPlans({ currentTier, pendingChange, onSelect }: Props) {
  const { t } = useTranslation('subscription');
  
  return (
    <section className="px-5 mt-4">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
        {t('plans', 'Available Plans')}
      </h2>
      
      <PlanComparison
        currentTier={currentTier}
        pendingChange={pendingChange}
        onSelect={onSelect}
      />
    </section>
  );
}