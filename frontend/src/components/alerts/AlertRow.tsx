import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Trash2, Zap, Bell, Clock, Moon } from 'lucide-react';
import type { AlertItem } from '../../services/alertsApi';
import { formatRelativeTime, getAlertUrgency, getProgress } from '../../utils/alertHelpers';

interface Props {
  item: AlertItem;
  onTap: (item: AlertItem) => void;
  onDelete: (id: string) => void;
}

const DELETE_THRESHOLD = -80;

export default function AlertRow({ item, onTap, onDelete }: Props) {
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const deleteOpacity = useTransform(x, [-120, -60, 0], [1, 0.6, 0]);
  const deleteScale = useTransform(x, [-120, -60, 0], [1, 0.8, 0.5]);
  const progress = getProgress(item);
  const urgency = getAlertUrgency(item);
  const isExpired = item.status === 'expired';

  const UrgencyIcon = urgency === 'expired' ? Moon : urgency === 'urgent' ? Zap : urgency === 'soon' ? Bell : Clock;

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (info.offset.x < DELETE_THRESHOLD) {
        setSwiped(true);
        controls.start({ x: -90 });
      } else {
        setSwiped(false);
        controls.start({ x: 0 });
      }
    },
    [controls],
  );

  const handleDelete = useCallback(() => {
    controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } }).then(() => {
      onDelete(item.id);
    });
  }, [controls, item.id, onDelete]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 bg-red-500/90"
        style={{ opacity: deleteOpacity }}
      >
        <motion.button
          style={{ scale: deleteScale }}
          onClick={handleDelete}
          className="flex items-center gap-2 text-white font-semibold text-[13px]"
        >
          <Trash2 size={18} />
          Delete
        </motion.button>
      </motion.div>

      {/* Swipeable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-tg-bg"
      >
        <button
          onClick={() => !swiped && onTap(item)}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-secondary/50 transition-colors"
        >
          {/* Icon */}
          <div
            className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center flex-shrink-0 text-xl transition-all ${
              isExpired
                ? 'bg-tg-hint/10'
                : item.secondsLeft <= 30
                  ? 'bg-orange-500/15 animate-pulse'
                  : item.secondsLeft <= 120
                    ? 'bg-amber-500/15'
                    : 'bg-tg-accent/10'
            }`}
          >
            <UrgencyIcon size={20} className={
              isExpired ? 'text-tg-hint/50' :
              urgency === 'urgent' ? 'text-orange-500' :
              urgency === 'soon' ? 'text-amber-500' : 'text-tg-accent'
            } />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-[15px] font-semibold leading-tight truncate ${
                isExpired ? 'text-tg-hint line-through' : 'text-tg-text'
              }`}
            >
              {item.text || 'Alert'}
            </p>
            <p
              className={`text-[12.5px] font-medium mt-0.5 ${
                isExpired
                  ? 'text-tg-hint/60'
                  : item.secondsLeft <= 120
                    ? 'text-orange-400'
                    : 'text-tg-hint'
              }`}
            >
              {formatRelativeTime(item.runAt)}
            </p>
          </div>

          {/* Progress indicator */}
          {!isExpired && (
            <div className="flex-shrink-0 w-[36px] h-[36px] relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-tg-border/30"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${(1 - progress) * 88} 88`}
                  strokeLinecap="round"
                  className={
                    item.secondsLeft <= 30
                      ? 'text-orange-500'
                      : item.secondsLeft <= 120
                        ? 'text-amber-400'
                        : 'text-tg-accent'
                  }
                />
              </svg>
            </div>
          )}
        </button>

        {/* Bottom separator */}
        <div className="absolute bottom-0 left-[62px] right-0 h-px bg-tg-border/20" />
      </motion.div>
    </div>
  );
}
