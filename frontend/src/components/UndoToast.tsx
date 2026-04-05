import { motion, AnimatePresence } from 'framer-motion';
import { useUndoStore, type UndoAction } from '../hooks/useUndo';
import { Star, Trash2, Archive, Heart, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BRAND } from '../design';

/** Animated SVG countdown ring — matches global Toast component */
function CountdownRing({ duration, startedAt }: { duration: number; startedAt: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, duration - elapsed);

  return (
    <svg width="20" height="20" className="shrink-0 -rotate-90">
      <circle cx="10" cy="10" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <motion.circle
        cx="10" cy="10" r={r}
        fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="2"
        strokeDasharray={c}
        strokeLinecap="round"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: c }}
        transition={{ duration: remaining / 1000, ease: 'linear' }}
      />
    </svg>
  );
}

const ICONS = {
  star: Star,
  trash: Trash2,
  archive: Archive,
  heart: Heart,
};

function UndoItem({ action }: { action: UndoAction }) {
  const { undo } = useUndoStore();
  const { t } = useTranslation('common');

  const Icon = ICONS[action.icon || 'trash'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: BRAND.motion.fast, ease: BRAND.motion.easeOut }}
      className="flex items-center gap-2.5 px-4 py-3 max-w-sm w-max bg-black/80 backdrop-blur-xl border border-white/10 rounded-full pointer-events-auto"
    >
      <Icon className="w-5 h-5 flex-shrink-0 text-white/80" />

      <span className="text-[14px] font-medium text-white/95 leading-snug truncate max-w-[160px]">
        {action.message}
      </span>

      <button
        onClick={() => undo(action.id)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all shrink-0"
      >
        <Undo2 size={12} className="text-white/80" />
        <span className="text-[11px] font-bold text-white/80">{t('undo', 'Undo')}</span>
      </button>

      <CountdownRing duration={action.duration} startedAt={action.startedAt} />
    </motion.div>
  );
}

export default function UndoToast() {
  const { actions } = useUndoStore();

  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[10001] flex flex-col items-center pointer-events-none px-4">
      <AnimatePresence mode="popLayout">
        {actions.slice(0, 3).map((action) => (
          <UndoItem key={action.id} action={action} />
        ))}
      </AnimatePresence>
    </div>
  );
}
