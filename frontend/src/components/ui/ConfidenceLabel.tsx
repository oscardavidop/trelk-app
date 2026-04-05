import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceData {
  level: ConfidenceLevel;
  score: number;
  basedOn: number;
  lastUpdated: number;
  source?: 'cache' | 'live' | 'computed';
}

const LEVEL_STYLES: Record<ConfidenceLevel, { dot: string; text: string }> = {
  high: { dot: 'bg-emerald-400', text: 'text-emerald-400/70' },
  medium: { dot: 'bg-amber-400', text: 'text-amber-400/70' },
  low: { dot: 'bg-red-400/70', text: 'text-red-400/60' },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Subtle confidence label — shows data reliability without being invasive.
 *
 * Usage:
 *   <ConfidenceLabel confidence={response.confidence} />
 */
export default function ConfidenceLabel({
  confidence,
  showUpdated = true,
  className = '',
}: {
  confidence?: ConfidenceData | null;
  showUpdated?: boolean;
  className?: string;
}) {
  if (!confidence) return null;

  const style = LEVEL_STYLES[confidence.level];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-1.5 ${className}`}
    >
      <span className={`w-[5px] h-[5px] rounded-full ${style.dot}`} />
      <span className={`text-[10px] font-medium ${style.text}`}>
        {confidence.basedOn > 0
          ? `Based on ${confidence.basedOn} ${confidence.basedOn === 1 ? 'user' : 'users'}`
          : 'No data yet'}
        {showUpdated && confidence.lastUpdated > 0 && (
          <> · Updated {relativeTime(confidence.lastUpdated)}</>
        )}
      </span>
    </motion.div>
  );
}
