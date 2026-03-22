import { useTranslation } from 'react-i18next';
import type { ProFeatures } from '../../services/subscriptionApi';
import { Clock, Zap, Headphones, Terminal } from 'lucide-react';

interface BenefitItem {
  label: string;
  value: string | number;
  bgClass: string;
  icon: React.ReactNode;
}

interface Props {
  features: ProFeatures;
}

export default function SubscriptionBenefits({ features }: Props) {
  const { t } = useTranslation('subscription');
  const { performance, support, custom_commands } = features;

  const benefits: BenefitItem[] = [
    {
      label: t('queue_priority', 'Queue Priority'),
      value: performance.queue_priority,
      bgClass: 'bg-blue-500/10 text-blue-500',
      icon: <Clock size={20} />,
    },
    {
      label: t('speed', 'Speed'),
      value: `${performance.response_speed_multiplier}x`,
      bgClass: 'bg-amber-500/10 text-amber-500',
      icon: <Zap size={20} />,
    },
    {
      label: t('support', 'Support'),
      value: support.priority + (support.live_chat_access ? ` + ${t('chat', 'Chat')}` : ''),
      bgClass: 'bg-emerald-500/10 text-emerald-500',
      icon: <Headphones size={20} />,
    },
    {
      label: t('commands:title', 'Custom Commands'),
      value: custom_commands.available
        ? `${custom_commands.used_commands || 0}/${custom_commands.max_commands}`
        : 'N/A',
      bgClass: 'bg-violet-500/10 text-violet-500',
      icon: <Terminal size={20} />,
    },
  ];

  return (
    <section className="px-5 mt-4">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
        {t('benefits', 'Benefits')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {benefits.map((b) => (
          <div
            key={b.label}
            className="bg-tg-secondary rounded-[20px] p-4 border border-tg-border/40 shadow-sm active:scale-[0.98] transition-transform duration-200 flex flex-col h-full"
          >
            <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center mb-3 shadow-sm ${b.bgClass}`}>
              {b.icon}
            </div>
            <div className="mt-auto">
              <div className="text-[15px] font-bold text-tg-text leading-tight">{b.label}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-1 capitalize leading-snug">{b.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}