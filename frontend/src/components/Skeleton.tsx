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
