import { useTranslation } from 'react-i18next';
import type { ProFeatures } from '../../services/subscriptionApi';
import LimitBar, { StaticLimit } from '../LimitBar';

interface Props {
  features: ProFeatures;
}

export default function SubscriptionUsage({ features }: Props) {
  const { t } = useTranslation('subscription');
  const { limits } = features;

  return (
    <section className="px-4">
      <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2.5 px-1">{t('usage')}</h2>
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-tg-border/20">
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
          label="Downloads"
          counter={limits.downloads_per_day}
        />
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
          label="AI Requests"
          counter={limits.ai_requests_per_day}
        />
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><path d="M12 3l1.5 4.5H18l-3.7 2.8 1.4 4.5L12 12l-3.7 2.8 1.4-4.5L6 7.5h4.5z" /></svg>}
          label="Premium AI"
          counter={limits.premium_ai_requests_per_day}
        />
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
          label={t('daily_alerts')}
          counter={limits.alerts.per_day}
        />
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
          label="SSWeb"
          counter={limits.ssweb.per_day}
        />
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M7 17h.01" /><path d="M17 17h.01" /></svg>}
          label="QR"
          counter={limits.qr.per_day}
        />
      </div>

      {/* Static Limits */}
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden divide-y divide-tg-border/20 mt-3">
        <LimitBar
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
          label="Alertas totales"
          counter={{ total: limits.alerts.total, used: limits.alerts.used }}
        />
        <StaticLimit
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tg-hint"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
          label="Archivo máximo"
          value={limits.file_upload_size_mb}
          suffix="MB"
        />
      </div>
    </section>
  );
}
