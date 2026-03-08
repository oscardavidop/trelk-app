import type { ProFeatures } from '../../services/subscriptionApi';

interface BenefitItem {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}

interface Props {
  features: ProFeatures;
}

export default function SubscriptionBenefits({ features }: Props) {
  const { performance, support, custom_commands } = features;

  const benefits: BenefitItem[] = [
    {
      label: 'Cola de prioridad',
      value: performance.queue_priority,
      color: '#3b82f6',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    },
    {
      label: 'Velocidad',
      value: `${performance.response_speed_multiplier}x`,
      color: '#f59e0b',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    },
    {
      label: 'Soporte',
      value: support.priority + (support.live_chat_access ? ' + Chat' : ''),
      color: '#10b981',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" /></svg>,
    },
    {
      label: 'Comandos',
      value: custom_commands.available
        ? `${custom_commands.used_commands || 0}/${custom_commands.max_commands}`
        : 'N/A',
      color: '#a855f7',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
    },
  ];

  return (
    <section className="px-4">
      <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2.5 px-1">Beneficios</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {benefits.map((b) => (
          <div
            key={b.label}
            className="bg-tg-secondary rounded-2xl p-3.5 border border-tg-border/15 active:scale-[0.97] transition-transform"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: `${b.color}12` }}
            >
              {b.icon}
            </div>
            <div className="text-[14px] font-semibold text-tg-text leading-tight">{b.label}</div>
            <div className="text-[12px] text-tg-hint mt-0.5 capitalize">{b.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
