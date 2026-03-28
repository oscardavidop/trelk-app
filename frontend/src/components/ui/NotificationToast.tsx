import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Trophy, AlertTriangle, CheckCircle, TrendingUp, ArrowUp,
  Megaphone, FileCheck, Brain, Clock, Bell,
} from 'lucide-react';

/* ── Type map ── */
const TYPE_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  achievement_unlocked: { icon: Trophy, color: 'text-amber-400' },
  review_rejected:      { icon: AlertTriangle, color: 'text-red-400' },
  review_approved:      { icon: CheckCircle, color: 'text-emerald-400' },
  command_trending:     { icon: TrendingUp, color: 'text-blue-400' },
  user_level_up:        { icon: ArrowUp, color: 'text-purple-400' },
  system_alert:         { icon: Megaphone, color: 'text-orange-400' },
  report_resolved:      { icon: FileCheck, color: 'text-teal-400' },
  ai_summary_updated:   { icon: Brain, color: 'text-indigo-400' },
  inactivity_reminder:  { icon: Clock, color: 'text-gray-400' },
};

const DEFAULT_TYPE = { icon: Bell, color: 'text-tg-accent' };

/* ── Toast queue ── */
interface ToastItem {
  id: number;
  type: string;
  titleKey: string;
  titleParams?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
}

let _toastListeners: Array<(t: ToastItem) => void> = [];
let _toastCounter = 0;

export function triggerToast(type: string, titleKey: string, titleParams?: Record<string, unknown>, priority: 'low' | 'normal' | 'high' = 'normal') {
  _toastCounter++;
  const item: ToastItem = { id: _toastCounter, type, titleKey, titleParams, priority };
  _toastListeners.forEach((fn) => fn(item));
}

function useToastListener(cb: (t: ToastItem) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const handler = (t: ToastItem) => ref.current(t);
    _toastListeners.push(handler);
    return () => { _toastListeners = _toastListeners.filter((f) => f !== handler); };
  }, []);
}

/* ── Animated progress bar ── */
function ProgressBar({ duration, onComplete }: { duration: number; onComplete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Force layout then animate
    el.style.transform = 'scaleX(1)';
    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms linear`;
      el.style.transform = 'scaleX(0)';
    });
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full overflow-hidden bg-white/5">
      <div ref={ref} className="h-full bg-tg-accent/60 origin-left" />
    </div>
  );
}

/* ── Main NotificationToast Component ── */
export default function NotificationToast() {
  const { t } = useTranslation('notifications');
  const [current, setCurrent] = useState<ToastItem | null>(null);

  const dismiss = useCallback(() => setCurrent(null), []);

  useToastListener((item) => {
    setCurrent(item);
  });

  const meta = current ? (TYPE_MAP[current.type] || DEFAULT_TYPE) : DEFAULT_TYPE;
  const Icon = meta.icon;
  const duration = current?.priority === 'high' ? 8_000 : 4_000;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 350 }}
          className="fixed top-[calc(env(safe-area-inset-top,0px)+8px)] left-4 right-4 z-[9998] pointer-events-auto"
        >
          <div className="max-w-[460px] mx-auto relative overflow-hidden px-4 py-3 rounded-[16px] bg-tg-secondary/90 backdrop-blur-xl border border-tg-border/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3">
              <Icon size={18} className={meta.color} />
              <span className="text-[13px] font-semibold text-tg-text truncate flex-1">
                {t(current.titleKey, { defaultValue: current.titleKey, ...(current.titleParams as Record<string, string> || {}) })}
              </span>
            </div>
            <ProgressBar duration={duration} onComplete={dismiss} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
