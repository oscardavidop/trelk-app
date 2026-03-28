import { memo } from 'react';
import { motion } from 'framer-motion';

const shimmer = {
  animate: { backgroundPosition: ['200% 0', '-200% 0'] },
  transition: { duration: 1.8, repeat: Infinity, ease: 'linear' as const },
};

function Bone({ className }: { className?: string }) {
  return (
    <motion.div
      animate={shimmer.animate}
      transition={shimmer.transition}
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgb(var(--tg-hint-rgb) / 0.06) 25%, rgb(var(--tg-hint-rgb) / 0.12) 50%, rgb(var(--tg-hint-rgb) / 0.06) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

function ReviewSkeleton() {
  return (
    <div className="py-4 border-b border-tg-border/10">
      <div className="flex items-center gap-3">
        <Bone className="w-9 h-9 rounded-full" />
        <div className="flex-1">
          <Bone className="h-3.5 w-24 mb-1.5" />
          <Bone className="h-2.5 w-32" />
        </div>
      </div>
      <div className="mt-3 pl-12 space-y-1.5">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
        <Bone className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export function ReviewListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="px-5">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewSummarySkeleton() {
  return (
    <section className="px-5 mt-6">
      <Bone className="h-4 w-20 mb-3" />
      <div className="bg-tg-secondary/80 rounded-[20px] border border-tg-border/40 p-4">
        <div className="flex gap-5">
          <div className="flex flex-col items-center min-w-[80px] gap-2">
            <Bone className="h-10 w-14" />
            <Bone className="h-3 w-16" />
            <Bone className="h-2.5 w-12" />
          </div>
          <div className="flex-1 flex flex-col gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <Bone className="h-2 w-[10px]" />
                <Bone className="h-2 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ReviewSkeleton);
