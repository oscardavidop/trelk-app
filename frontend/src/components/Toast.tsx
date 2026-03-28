import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../stores';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { BRAND } from '../design';

export default function Toast() {
  const { message, type, visible } = useToastStore();

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
            className="flex items-center gap-3 px-4 py-3 max-w-sm w-max bg-black/80 backdrop-blur-xl border border-white/10 rounded-full"
            style={{ boxShadow: `0 10px 40px rgba(0,0,0,0.3), 0 0 20px ${glow}` }}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <span className="text-[14.5px] font-medium text-white/95 leading-snug">
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}