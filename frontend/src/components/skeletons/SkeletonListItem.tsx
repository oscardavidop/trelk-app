import { SkeletonBlock } from './SkeletonBlock';

interface SkeletonListItemProps {
  className?: string;
}

/**
 * List-item skeleton: round avatar + two text lines + date badge.
 * Mirrors the ActivityItem visual structure.
 */
export function SkeletonListItem({ className = '' }: SkeletonListItemProps) {
  return (
    <div
      className={`flex items-center gap-3.5 p-4 bg-tg-secondary border-b border-tg-border/20 last:border-b-0 ${className}`}
      aria-hidden="true"
    >
      {/* Avatar */}
      <SkeletonBlock className="w-10 h-10 rounded-[12px] shrink-0" />

      {/* Lines */}
      <div className="flex-1 space-y-2 min-w-0">
        <SkeletonBlock className="h-3.5 w-3/4 rounded-full" />
        <SkeletonBlock className="h-2.5 w-1/3 rounded-full" />
      </div>

      {/* Date badge */}
      <SkeletonBlock className="w-10 h-4 rounded-full shrink-0 opacity-40" />
    </div>
  );
}
