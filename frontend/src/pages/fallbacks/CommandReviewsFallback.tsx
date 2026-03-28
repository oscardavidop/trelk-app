import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ReviewListSkeleton, ReviewSummarySkeleton } from '@/components/commands/reviews';

export default function CommandReviewsFallback() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="pb-20 max-w-[480px] mx-auto w-full animate-pulse"
      aria-hidden="true"
    >
      {/* 1. Fake Header (Coincidiendo con el StickySectionHeader) */}
      <div className="sticky top-0 z-50 bg-tg-bg/90 backdrop-blur-xl px-4 pt-3 pb-3 flex items-center gap-3 border-b border-tg-border/10">
        <div className="w-9 h-9 rounded-full bg-tg-secondary/80 flex items-center justify-center">
          <ArrowLeft size={18} className="text-tg-text/30" />
        </div>
        <div className="space-y-1">
          <div className="h-4 w-32 bg-tg-text/15 rounded-md" />
          <div className="h-3 w-16 bg-tg-text/10 rounded-md" />
        </div>
      </div>

      <div className="overflow-x-hidden">
        {/* 2. Reutilizando tu ReviewSummarySkeleton */}
        <div className="mt-2">
          <ReviewSummarySkeleton />
        </div>

        {/* 3. Fake WriteReview Box */}
        <div className="px-5 mt-4">
          <div className="w-full h-24 bg-tg-secondary/40 border border-dashed border-tg-border/30 rounded-[20px] flex items-center justify-center">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-tg-text/10" />
              ))}
            </div>
          </div>
        </div>

        {/* 4. Fake Filters */}
        <div className="mt-6 px-5 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-tg-text/10 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* 5. Reutilizando tu ReviewListSkeleton */}
        <div className="mt-6">
          <ReviewListSkeleton count={5} />
        </div>
      </div>
    </motion.div>
  );
}