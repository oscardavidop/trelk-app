import { AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBotStatus } from '../../hooks/useBotStatus';

export default function StatusBanner() {
  const { status } = useBotStatus();
  const { t } = useTranslation('ui');

  if (status === 'online') return null;

  const isDegraded = status === 'degraded';
  const Icon = isDegraded ? AlertTriangle : XCircle;

  return (
    <div
      className={`mx-5 mt-3 px-4 py-3 rounded-[14px] border flex items-center gap-3 animate-fade-in ${
        isDegraded
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
          : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <p className="text-[13px] font-medium leading-snug">
        {isDegraded ? t('banner_degraded') : t('banner_down')}
      </p>
    </div>
  );
}
