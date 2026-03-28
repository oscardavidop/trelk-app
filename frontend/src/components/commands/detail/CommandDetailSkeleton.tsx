import { memo } from 'react';
import { motion } from 'framer-motion';

const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear' as const,
  },
};

function Bone({ className }: { className: string }) {
  return (
    <motion.div
      className={`rounded-[12px] bg-gradient-to-r from-tg-hint/5 via-tg-hint/10 to-tg-hint/5 bg-[length:200%_100%] ${className}`}
      animate={shimmer.animate}
      transition={shimmer.transition}
    />
  );
}

function CommandDetailSkeleton() {
  return (
    <div className="pb-28 max-w-[480px] mx-auto animate-pulse relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-tg-accent/5 blur-3xl animate-glow-pulse" />
      <div className="absolute top-40 -left-16 w-32 h-32 rounded-full bg-purple-500/5 blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />

      {/* Hero skeleton */}
      <div className="px-5 pt-5 pb-3 relative">
        <div className="flex items-start gap-4">
          <Bone className="w-[72px] h-[72px] rounded-[22px] flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <Bone className="h-7 w-[60%]" />
            <Bone className="h-4 w-[90%]" />
            <div className="flex gap-2">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
        <Bone className="h-12 w-full rounded-[18px] mt-4" />
        <Bone className="h-12 w-full rounded-[18px] mt-3" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-2.5 px-5 mt-5">
        {[...Array(4)].map((_, i) => (
          <Bone key={i} className="h-[90px] rounded-[20px]" />
        ))}
      </div>

      {/* Sections */}
      <div className="px-5 mt-8 space-y-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-[120px] rounded-[24px]" />
      </div>
      <div className="px-5 mt-8 space-y-3">
        <Bone className="h-4 w-32" />
        <Bone className="h-[160px] rounded-[24px]" />
      </div>
    </div>
  );
}

export default memo(CommandDetailSkeleton);
