import { SkeletonBlock } from './SkeletonBlock';

interface SkeletonCardProps {
  className?: string;
}

/**
 * Card-shaped skeleton: square icon + two text lines.
 * Matches CommandCard / command list item visual structure.
 */
export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`flex items-center gap-3.5 p-4 bg-tg-secondary border-b border-tg-border/20 last:border-b-0 ${className}`}
      aria-hidden="true"
    >
      {/* Icon placeholder */}
      <SkeletonBlock className="w-9 h-9 rounded-[10px] shrink-0" />

      {/* Lines */}
      <div className="flex-1 space-y-2 min-w-0">
        <SkeletonBlock className="h-3.5 w-3/4 rounded-full" />
        <SkeletonBlock className="h-2.5 w-2/5 rounded-full" />
      </div>

      {/* Chevron placeholder */}
      <SkeletonBlock className="w-4 h-4 rounded-full shrink-0 opacity-40" />
    </div>
  );
}
