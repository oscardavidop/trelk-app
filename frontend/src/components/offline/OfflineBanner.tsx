import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOfflineStore } from '../../lib/offline';

export default function OfflineBanner() {
  const { t } = useTranslation('offline');
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingSyncs = useOfflineStore((s) => s.pendingSyncs);
  const syncing = useOfflineStore((s) => s.syncing);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              {t('offline_message')}
            </span>
            {pendingSyncs > 0 && (
              <span className="text-[10px] text-amber-500/70">
                ({pendingSyncs} {t('pending')})
              </span>
            )}
          </div>
        </motion.div>
      )}
      {isOnline && syncing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-tg-accent/5 border-b border-tg-accent/10">
            <RefreshCw className="w-3 h-3 text-tg-accent animate-spin" />
            <span className="text-[11px] text-tg-accent">{t('syncing')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
