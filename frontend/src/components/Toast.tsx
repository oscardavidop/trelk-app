import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../stores';
import { CheckCircle2, AlertCircle, Info, RotateCcw } from 'lucide-react';
import { BRAND } from '../design';

/** Animated SVG countdown ring — fills as time runs out */
function CountdownRing({ duration, type }: { duration: number; type: string }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const stroke = type === 'error' ? 'rgba(239,68,68,0.5)' : type === 'success' ? 'rgba(16,185,129,0.5)' : 'rgba(59,130,246,0.5)';

  return (
    <svg width="20" height="20" className="shrink-0 -rotate-90">
      <circle cx="10" cy="10" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <motion.circle
        cx="10" cy="10" r={r}
        fill="none" stroke={stroke} strokeWidth="2"
        strokeDasharray={c}
        strokeLinecap="round"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: c }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </svg>
  );
}

export default function Toast() {
  const { message, type, visible, retryFn, duration, hide } = useToastStore();

  if (!message) return null;

  const config = {
    error: { icon: AlertCircle, iconColor: 'text-red-400', glow: 'rgba(239,68,68,0.15)' },
    success: { icon: CheckCircle2, iconColor: 'text-emerald-400', glow: 'rgba(16,185,129,0.15)' },
    info: { icon: Info, iconColor: 'text-blue-400', glow: 'rgba(59,130,246,0.15)' },
  }[type || 'info'] ?? { icon: Info, iconColor: 'text-blue-400', glow: 'rgba(59,130,246,0.15)' };

  const { icon: Icon, iconColor, glow } = config;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: BRAND.motion.fast, ease: BRAND.motion.easeOut }}
            className="flex items-center gap-2.5 px-4 py-3 max-w-sm w-max bg-black/80 backdrop-blur-xl border border-white/10 rounded-full pointer-events-auto"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <span className="text-[14px] font-medium text-white/95 leading-snug">
              {message}
            </span>

            {retryFn && (
              <button
                onClick={() => { retryFn(); hide(); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all shrink-0"
              >
                <RotateCcw size={12} className="text-white/80" />
                <span className="text-[11px] font-bold text-white/80">Retry</span>
              </button>
            )}

            <button
              onClick={hide}
              className="shrink-0 active:scale-90 transition-transform"
            >
              <CountdownRing duration={duration} type={type} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}