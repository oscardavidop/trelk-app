import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore, useUserStore } from '../stores';
import { findCommand, cmdSlug } from '../data/botCommands';
import {
    fetchReviewsSummary, fetchReviews, fetchMyReview, submitRating,
    toggleReviewHelpful, deleteMyReview, reportReview, adminDeleteReview,
    type Review, type ReviewsSummary, type MyReview,
} from '../services/commandStatsApi';
import {
    ReviewSummaryCard, ReviewCard, WriteReview, ReviewFilters,
    ReviewListSkeleton, ReviewSummarySkeleton, ReviewAISummary, ReviewHighlights,
    type ReviewFilterType, type ReviewSortType,
} from '../components/commands/reviews';
import { StickySectionHeader } from '@/components/StickyHeader';

const PAGE_SIZE = 10;

export default function CommandReviewsPage() {
    const { command: slug, userId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation('commandDetail');
    const { haptic } = useTelegram();
    const showToast = useToastStore((s) => s.show);
    const appUser = useUserStore((s) => s.user);
    const currentUserId = appUser?.authTelegram?.id;
    const isAdmin = appUser?.isAdmin === true;
    const queryClient = useQueryClient();

    const cmd = slug ? findCommand(slug) : undefined;
    const mainSlug = cmd ? cmdSlug(cmd) : '';

    const [filter, setFilter] = useState<ReviewFilterType>('all');
    const [sort, setSort] = useState<ReviewSortType>('relevant');
    const loaderRef = useRef<HTMLDivElement>(null);

    // ── Summary query ──
    const { data: summary, isLoading: summaryLoading } = useQuery<ReviewsSummary>({
        queryKey: ['reviews-summary', mainSlug],
        queryFn: () => fetchReviewsSummary(mainSlug),
        enabled: !!mainSlug,
        staleTime: 30_000,
    });

    // ── My review query (polls every 5s while pending) ──
    const { data: myReviewData } = useQuery<{ review: MyReview | null }>({
        queryKey: ['my-review', mainSlug],
        queryFn: () => fetchMyReview(mainSlug),
        enabled: !!mainSlug,
        staleTime: (query) => {
            const review = query.state.data?.review;
            return review?.status === 'pending' ? 0 : 60_000;
        },
        refetchInterval: (query) => {
            const review = query.state.data?.review;
            return review?.status === 'pending' ? 5_000 : false;
        },
    });
    const myReview = myReviewData?.review ?? null;

    // ── React to moderation decision (polling result) ──
    const prevStatusRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const prev = prevStatusRef.current;
        const curr = myReview?.status;
        prevStatusRef.current = curr;
        if (prev === 'pending' && curr && curr !== 'pending') {
            if (curr === 'approved') {
                showToast(t('reviews_approved_toast'), 'success');
            } else if (curr === 'rejected') {
                showToast(t(myReview?.moderationRejectionKey || 'reviews_rejected'), 'error');
            }
            queryClient.invalidateQueries({ queryKey: ['reviews', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['reviews-summary', mainSlug] });
        }
    }, [myReview?.status, myReview?.moderationRejectionKey, showToast, t, queryClient, mainSlug]);

    // ── Build query params from filters ──
    const getApiParams = useCallback(() => {
        const ratingFilter = typeof filter === 'number' ? filter : undefined;
        const typeFilter = filter === 'positive' || filter === 'negative' ? filter : undefined;
        return { sort, rating: ratingFilter, type: typeFilter };
    }, [filter, sort]);

    // ── Infinite scroll query ──
    const {
        data: reviewsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: reviewsLoading,
    } = useInfiniteQuery({
        queryKey: ['reviews', mainSlug, filter, sort],
        queryFn: async ({ pageParam = 0 }) => {
            const { rating, type } = getApiParams();
            return fetchReviews(mainSlug, PAGE_SIZE, pageParam, sort, rating, type);
        },
        getNextPageParam: (lastPage, allPages) => {
            const offset = allPages.reduce((acc, p) => acc + p.items.length, 0);
            return lastPage.hasMore ? offset : undefined;
        },
        initialPageParam: 0,
        enabled: !!mainSlug,
        staleTime: 30_000,
    });

    const allReviews: Review[] = reviewsData?.pages.flatMap((p) => p.items) ?? [];
    const totalReviews = reviewsData?.pages[0]?.total ?? 0;

    // ── Infinite scroll observer ──
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // ── Toggle helpful mutation ──
    const helpfulMutation = useMutation({
        mutationFn: toggleReviewHelpful,
        onMutate: async (reviewId: string) => {
            await queryClient.cancelQueries({ queryKey: ['reviews', mainSlug] });
            queryClient.setQueryData(['reviews', mainSlug, filter, sort], (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((r: Review) =>
                            r.id === reviewId
                                ? { ...r, myHelpful: !r.myHelpful, helpfulCount: r.helpfulCount + (r.myHelpful ? -1 : 1) }
                                : r,
                        ),
                    })),
                };
            });
        },
        onError: () => showToast(t('error_system'), 'error'),
        onSuccess: (data) => {
            showToast(data.helpful ? t('reviews_helpful_thanks') : t('reviews_helpful_removed'), 'info');
        },
    });

    const handleToggleHelpful = useCallback((reviewId: string) => {
        helpfulMutation.mutate(reviewId);
    }, [helpfulMutation]);

    /* ── Delete review ── */
    const handleDeleteReview = useCallback(async () => {
        try {
            await deleteMyReview(mainSlug);
            haptic?.notificationOccurred('success');
            showToast(t('reviews_deleted'), 'success');
            queryClient.invalidateQueries({ queryKey: ['reviews-summary', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['reviews', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['my-review', mainSlug] });
        } catch {
            showToast(t('error_system'), 'error');
        }
    }, [mainSlug, haptic, showToast, t, queryClient]);

    /* ── Report review ── */
    const handleReportReview = useCallback(async (reviewId: string) => {
        try {
            await reportReview(reviewId);
            haptic?.notificationOccurred('success');
            showToast(t('reviews_reported'), 'success');
        } catch {
            showToast(t('error_system'), 'error');
        }
    }, [haptic, showToast, t]);

    /* ── Admin delete review ── */
    const handleAdminDeleteReview = useCallback(async (reviewId: string) => {
        try {
            await adminDeleteReview(reviewId);
            haptic?.notificationOccurred('success');
            showToast(t('reviews_deleted'), 'success');
            queryClient.invalidateQueries({ queryKey: ['reviews-summary', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['reviews', mainSlug] });
        } catch {
            showToast(t('error_system'), 'error');
        }
    }, [mainSlug, haptic, showToast, t, queryClient]);

    // ── Submit review ──
    const [submitting, setSubmitting] = useState(false);
    const handleSubmitReview = useCallback(async (rating: number, comment: string): Promise<any> => {
        setSubmitting(true);
        try {
            const result = await submitRating(mainSlug, rating, comment);
            haptic?.notificationOccurred('success');
            if (result?.status === 'pending') {
                showToast(t('reviews_pending_toast', 'Your review is being moderated'), 'info');
            } else {
                showToast(myReview ? t('reviews_updated') : t('reviews_published'), 'success');
            }
            queryClient.invalidateQueries({ queryKey: ['reviews', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['reviews-summary', mainSlug] });
            queryClient.invalidateQueries({ queryKey: ['my-review', mainSlug] });
            return true;
        } catch (error: any) {
            const key = error.error_key;
            showToast(key ? t(key) : t('error_system'), 'error');
             throw error;
        } finally {
            setSubmitting(false);

        }
    }, [mainSlug, haptic, showToast, t, myReview, queryClient]);

    // ── Filter/sort change resets ──
    const handleFilterChange = useCallback((f: ReviewFilterType) => setFilter(f), []);
    const handleSortChange = useCallback((s: ReviewSortType) => setSort(s), []);
    const handleFilterStar = useCallback((star: number | null) => {
        setFilter((star ?? 'all') as ReviewFilterType);
    }, []);

    if (!cmd) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-tg-hint">{t('command_not_found')}</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="pb-20 max-w-[480px] mx-auto"
        >
            {/* Header */}
            <StickySectionHeader>
                <div className="bg-tg-bg/90 backdrop-blur-xl px-4 pt-3 flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center active:shadow-[0_0_8px_rgba(var(--tg-accent-rgb,59,130,246),0.25)]"
                    >
                        <ArrowLeft size={18} className="text-tg-text" />
                    </motion.button>
                    <div>
                        <h1 className="text-[16px] font-bold text-tg-text leading-tight">{t('reviews_title')}</h1>
                        <span className="text-[12px] text-tg-hint">/{cmd.name[0]}</span>
                    </div>
                </div>
            </StickySectionHeader>
            <div className='overflow-x-hidden'>

                {/* Summary */}
                {summaryLoading ? (
                    <ReviewSummarySkeleton />
                ) : summary ? (
                    <ReviewSummaryCard
                        summary={summary}
                        onFilterStar={handleFilterStar}
                        activeStar={typeof filter === 'number' ? filter : null}
                    />
                ) : null}

                {/* Highlights */}
                {mainSlug && <ReviewHighlights command={mainSlug} />}

                {/* AI Summary */}
                {mainSlug && <ReviewAISummary command={mainSlug} />}

                {/* Write / Edit review */}
                <WriteReview
                    initialRating={myReview?.rating}
                    initialComment={myReview?.review}
                    isEditing={!!myReview}
                    loading={submitting}
                    disabled={myReview?.status === 'pending'}
                    disabledReason={myReview?.status === 'pending' ? t('reviews_edit_blocked_pending') : undefined}
                    onSubmit={handleSubmitReview}
                    onDelete={handleDeleteReview}
                />

                {/* Pending moderation banner */}
                {myReview?.status === 'pending' && (
                    <div className="mx-5 mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-500 text-lg">⏳</span>
                        <div>
                            <p className="text-[13px] font-semibold text-amber-600">{t('reviews_pending_title')}</p>
                            <p className="text-[11.5px] text-amber-600/70">{t('reviews_pending_desc')}</p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mt-5">
                    <ReviewFilters
                        activeFilter={filter}
                        activeSort={sort}
                        onFilterChange={handleFilterChange}
                        onSortChange={handleSortChange}
                    />
                </div>

                {/* Reviews list */}
                <div className="mt-2">
                    {reviewsLoading ? (
                        <ReviewListSkeleton count={6} />
                    ) : allReviews.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-[13px] text-tg-hint/50">{t('reviews_empty_list_hint')}</p>
                        </div>
                    ) : (
                        <div className="px-5">
                            {allReviews.map((review) => (
                                <div key={`${review.id}`}>
                                    <ReviewCard
                                        review={review}
                                        isOwn={currentUserId === review.userId}
                                        isAdmin={isAdmin}
                                        onToggleHelpful={handleToggleHelpful}
                                        onDelete={(id) => { handleDeleteReview(); }}
                                        onAdminDelete={handleAdminDeleteReview}
                                        onReport={handleReportReview}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Infinite scroll loader */}
                    <div ref={loaderRef} className="h-4" />
                    {isFetchingNextPage && <ReviewListSkeleton count={3} />}

                    {/* End of list */}
                    {!hasNextPage && allReviews.length > 0 && (
                        <p className="text-center text-[12px] text-tg-hint/50 py-6">{t('reviews_end_of_list')}</p>
                    )}
                </div>
            </div>

        </motion.div>
    );
}
