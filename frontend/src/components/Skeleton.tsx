interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative animate-pulse rounded-xl bg-tg-surface/60 overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[24px] bg-tg-secondary/70 backdrop-blur-sm border border-tg-border/20 p-4 space-y-3 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-tg-accent/5 blur-2xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-[12px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/* ── Smart Skeletons — mimic real content layout ── */

/** Review card skeleton — matches ReviewCard layout */
export function ReviewSkeleton() {
  return (
    <div className="bg-tg-secondary/70 border border-tg-border/20 rounded-[16px] p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-3.5 h-3.5 rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-3 pt-1">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** Command detail hero skeleton */
export function CommandDetailSkeleton() {
  return (
    <div className="space-y-5 px-5 pt-8 pb-24">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-[16px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="flex-1 h-16 rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-[16px]" />
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <ReviewSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Horizontal scroll section skeleton */
export function HScrollSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2.5 overflow-hidden px-5 pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="flex-shrink-0 w-[152px] h-[120px] rounded-[20px]" />
      ))}
    </div>
  );
}

/** Stats pill skeleton row */
export function StatsPillSkeleton() {
  return (
    <div className="flex gap-2 px-5">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}
