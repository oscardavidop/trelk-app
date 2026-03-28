import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReviewCard from './ReviewCard';
import type { Review } from '../../../services/commandStatsApi';

interface Props {
    reviews: Review[];
    totalReviews: number;
    currentUserId?: number;
    isAdmin: boolean | undefined;
    onSeeAll: () => void;
    onToggleHelpful: (reviewId: string) => void;
    onDelete?: (reviewId: string) => void;
    onReport?: (reviewId: string) => void;
}

function ReviewPreview({ reviews, totalReviews, isAdmin, currentUserId, onSeeAll, onToggleHelpful, onDelete, onReport }: Props) {
    const { t } = useTranslation('commandDetail');

    if (reviews.length === 0) {
        return null
    }

    return (
        <section className="px-5 mt-2">
            <div className="divide-y divide-tg-border/15">
                {reviews.slice(0, 4).map((review) => (
                    <ReviewCard
                    isAdmin={isAdmin}
                        key={review.id}
                        review={review}
                        isOwn={currentUserId === review.userId}
                        onToggleHelpful={onToggleHelpful}
                        onDelete={onDelete}
                        onReport={onReport}
                    />
                ))}
            </div>

            {/* See all button */}
            {totalReviews > 4 && (
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onSeeAll}
                    className="w-full mt-3 py-3 rounded-[14px] bg-tg-secondary/60 border border-tg-border/30 text-[13px] font-semibold text-tg-accent flex items-center justify-center gap-1.5 hover:bg-tg-secondary/80 transition-colors"
                >
                    {t('reviews_see_all', { count: totalReviews })}
                    <ChevronRight size={14} />
                </motion.button>
            )}
        </section>
    );
}

export default memo(ReviewPreview);
