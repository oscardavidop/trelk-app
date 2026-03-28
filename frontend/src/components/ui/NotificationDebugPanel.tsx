import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, ChevronUp } from 'lucide-react';
import { useNotificationsStore } from '../../stores/notifications';

/**
 * Dev-only debug panel for notification system diagnostics.
 * Only renders when import.meta.env.DEV is true.
 */
export default function NotificationDebugPanel() {
  const [open, setOpen] = useState(false);
  const store = useNotificationsStore();

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-3 z-[9999] w-9 h-9 rounded-full bg-red-500/80 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
      >
        {open ? <X size={16} /> : <Bug size={16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-32 right-3 z-[9999] w-[260px] rounded-[16px] bg-gray-900/95 backdrop-blur-lg border border-gray-700/50 shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Notifications Debug</span>
              <ChevronUp size={14} className="text-gray-500" />
            </div>
            <div className="px-3 py-2 space-y-1.5 text-[11px] font-mono">
              <Row label="Loaded" value={store.loaded ? 'yes' : 'no'} />
              <Row label="Loading" value={store.loading ? 'yes' : 'no'} />
              <Row label="Unread" value={String(store.unreadCount)} highlight />
              <Row label="Total" value={String(store.total)} />
              <Row label="In memory" value={String(store.notifications.length)} />
              <Row label="Page" value={`${store.page}/${store.totalPages}`} />
              <Row label="Error" value={store.error || 'none'} error={!!store.error} />
              <div className="pt-1 border-t border-gray-700/30">
                <Row label="Newest" value={store.notifications[0]?.type || '-'} />
                <Row label="Created" value={store.notifications[0] ? new Date(store.notifications[0].createdAt).toLocaleTimeString() : '-'} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ label, value, highlight, error }: { label: string; value: string; highlight?: boolean; error?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={
        error ? 'text-red-400' :
        highlight ? 'text-emerald-400 font-bold' :
        'text-gray-300'
      }>{value}</span>
    </div>
  );
}
