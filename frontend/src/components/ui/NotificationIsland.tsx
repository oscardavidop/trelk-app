import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import {
  Trophy, AlertTriangle, CheckCircle, TrendingUp, ArrowUp,
  Megaphone, FileCheck, Brain, Clock, Bell, Sparkles,
} from 'lucide-react';
import type { NotificationItem } from '../../services/notificationsApi';

/* ── Icon + color map per notification type ── */
const TYPE_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  achievement_unlocked: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  review_rejected:      { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  review_approved:      { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  command_trending:     { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  user_level_up:        { icon: ArrowUp, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  system_alert:         { icon: Megaphone, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  report_resolved:      { icon: FileCheck, color: 'text-teal-400', bg: 'bg-teal-500/15' },
  ai_summary_updated:   { icon: Brain, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  inactivity_reminder:  { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/15' },
};

const DEFAULT_TYPE = { icon: Bell, color: 'text-tg-accent', bg: 'bg-tg-accent/15' };

/* ── Anti-spam: min interval between islands ── */
const MIN_ISLAND_GAP = 4_000;

/* ── Island Store (simple module-level state) ── */
type IslandPayload = { items: NotificationItem[]; id: number };
let _listeners: Array<(p: IslandPayload) => void> = [];
let _counter = 0;
let _lastShow = 0;

export function triggerIsland(items: NotificationItem[]) {
  const now = Date.now();
  if (now - _lastShow < MIN_ISLAND_GAP) return;
  // Filter out low priority — those are silent (badge only)
  const visible = items.filter((n) => n.priority !== 'low');
  if (visible.length === 0) return;
  _lastShow = now;
  _counter++;
  const payload = { items: visible, id: _counter };
  _listeners.forEach((fn) => fn(payload));
}

function useIslandListener(cb: (p: IslandPayload) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const handler = (p: IslandPayload) => ref.current(p);
    _listeners.push(handler);
    return () => { _listeners = _listeners.filter((f) => f !== handler); };
  }, []);
}

/* ── Single Notification Card ── */
function SingleCard({ item, onTap }: { item: NotificationItem; onTap: () => void }) {
  const { t } = useTranslation('notifications');
  const meta = TYPE_MAP[item.type] || DEFAULT_TYPE;
  const Icon = meta.icon;

  const title = t(item.titleKey, { defaultValue: item.titleKey, ...(item.titleParams as Record<string, string> || {}) });
  const message = t(item.messageKey, { defaultValue: item.messageKey, ...(item.messageParams as Record<string, string> || {}) });

  return (
    <motion.button
      onClick={onTap}
      className="w-full flex items-center gap-3 text-left active:scale-[0.97] transition-transform"
    >
      <div className={`w-10 h-10 rounded-[12px] ${meta.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-tg-text leading-tight truncate">{title}</div>
        <div className="text-[12px] text-tg-hint leading-snug truncate mt-0.5">{message}</div>
      </div>
    </motion.button>
  );
}

/* ── Stacked Multi Card ── */
function StackedCard({ items, onTap }: { items: NotificationItem[]; onTap: () => void }) {
  const { t } = useTranslation('notifications');
  const count = items.length;
  const first = items[0];
  const meta = TYPE_MAP[first.type] || DEFAULT_TYPE;
  const Icon = meta.icon;

  return (
    <motion.button
      onClick={onTap}
      className="w-full relative active:scale-[0.97] transition-transform"
    >
      {/* Stacked back cards */}
      {count >= 3 && (
        <div className="absolute -bottom-1.5 left-3 right-3 h-full rounded-[18px] bg-tg-secondary/60 border border-tg-border/20" />
      )}
      {count >= 2 && (
        <div className="absolute -bottom-0.5 left-1.5 right-1.5 h-full rounded-[20px] bg-tg-secondary/80 border border-tg-border/30" />
      )}
      {/* Front card */}
      <div className="relative flex items-center gap-3 text-left">
        <div className={`w-10 h-10 rounded-[12px] ${meta.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-tg-text leading-tight truncate">
            {t(first.titleKey, { defaultValue: first.titleKey, ...(first.titleParams as Record<string, string> || {}) })}
          </div>
          <div className="text-[12px] text-tg-hint mt-0.5">
            +{count} {t('new_notifications', { defaultValue: 'new notifications' })}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-tg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-white">{count > 9 ? '9+' : count}</span>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Main NotificationIsland Component ── */
export default function NotificationIsland() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { haptic } = useTelegram();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<IslandPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useIslandListener((p) => {
    setPayload(p);
    setVisible(true);
    haptic?.impactOccurred('light');

    if (timerRef.current) clearTimeout(timerRef.current);
    // High priority → don't auto-hide
    const hasHigh = p.items.some((i) => i.priority === 'high');
    if (!hasHigh) {
      timerRef.current = setTimeout(dismiss, 5_000);
    }
  });

  const handleTap = useCallback(() => {
    dismiss();
    haptic?.impactOccurred('light');
    if (!payload) return;
    if (payload.items.length === 1 && payload.items[0].link) {
      navigate(payload.items[0].link);
    } else {
      navigate(`/users/ui/${userId}/notifications`);
    }
  }, [payload, navigate, userId, haptic, dismiss]);

  return (
    <AnimatePresence>
      {visible && payload && (
        <motion.div
          key={payload.id}
          initial={{ opacity: 0, y: -40, scale: 0.85, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -30, scale: 0.9, filter: 'blur(6px)' }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed top-[calc(env(safe-area-inset-top,0px)+8px)] left-4 right-4 z-[9999] pointer-events-auto"
        >
          <div className="max-w-[460px] mx-auto px-4 py-3.5 rounded-[22px] bg-tg-secondary/95 backdrop-blur-xl border border-tg-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            {payload.items.length === 1 ? (
              <SingleCard item={payload.items[0]} onTap={handleTap} />
            ) : (
              <StackedCard items={payload.items} onTap={handleTap} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
