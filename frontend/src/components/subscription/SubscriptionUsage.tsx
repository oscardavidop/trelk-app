import { useTranslation } from 'react-i18next';
import type { ProFeatures } from '../../services/subscriptionApi';
import LimitBar, { StaticLimit } from '../LimitBar';
import { 
  DownloadCloud, 
  Zap, 
  Sparkles, 
  Bell, 
  Globe, 
  QrCode, 
  FolderLock 
} from 'lucide-react';

interface Props {
  features: ProFeatures;
}

export default function SubscriptionUsage({ features }: Props) {
  const { t } = useTranslation('subscription');
  const { limits } = features;

  return (
    <section className="px-5 mt-4">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
        {t('usage', 'Usage Limits')}
      </h2>
      
      {/* ── Límites Diarios ── */}
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden border border-tg-border/40 shadow-sm mb-4">
        <div className="flex flex-col [&>div]:border-b [&>div]:border-tg-border/20 [&>div:last-child]:border-0">
          <LimitBar
            icon={<DownloadCloud size={18} className="text-sky-500" />}
            label={t('downloads', 'Downloads')}
            counter={limits.downloads_per_day}
          />
          <LimitBar
            icon={<Zap size={18} className="text-amber-500" />}
            label={t('ai_requests', 'AI Requests')}
            counter={limits.ai_requests_per_day}
          />
          <LimitBar
            icon={<Sparkles size={18} className="text-violet-500" />}
            label={t('premium_ai', 'Premium AI')}
            counter={limits.premium_ai_requests_per_day}
          />
          <LimitBar
            icon={<Bell size={18} className="text-rose-500" />}
            label={t('daily_alerts', 'Daily Alerts')}
            counter={limits.alerts.per_day}
          />
          <LimitBar
            icon={<Globe size={18} className="text-emerald-500" />}
            label={t('ssweb', 'SSWeb')}
            counter={limits.ssweb.per_day}
          />
          <LimitBar
            icon={<QrCode size={18} className="text-tg-text/60" />}
            label={t('qr', 'QR')}
            counter={limits.qr.per_day}
          />
        </div>
      </div>

      {/* ── Límites Estáticos / Totales ── */}
      <div className="bg-tg-secondary rounded-[20px] overflow-hidden border border-tg-border/40 shadow-sm">
        <div className="flex flex-col [&>div]:border-b [&>div]:border-tg-border/20 [&>div:last-child]:border-0">
          <LimitBar
            icon={<Bell size={18} className="text-rose-500/70" />}
            label={t('total_alerts', 'Total Alerts')}
            counter={{ total: limits.alerts.total, used: limits.alerts.used }}
          />
          <StaticLimit
            icon={<FolderLock size={18} className="text-indigo-500" />}
            label={t('max_file_size', 'Max File Size')}
            value={limits.file_upload_size_mb}
            suffix="MB"
          />
        </div>
      </div>
    </section>
  );
}