import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore, useUserStore } from '../stores';
import { useBotStatus } from '../hooks/useBotStatus';
import { BOT_COMMANDS, findCommand, cmdSlug } from '../data/botCommands';
import { getExamples, getComments } from '../data/commandMocks';
import {
  fetchCommandStats, fetchMyRating, submitRating, fetchMyReportStatus,
  fetchReviewsSummary, fetchReviews, fetchMyReview, toggleReviewHelpful,
  deleteMyReview, reportReview, fetchCommandSignals, fetchCommandKnowledge,
  type CommandStatsData, type ReviewsSummary, type Review, type MyReview,
} from '../services/commandStatsApi';
import ReportErrorModal from '../components/commands/ReportErrorModal';
import CommandFeedback from '@/components/commands/CommandFeedback';
import { AlertTriangle, Send } from 'lucide-react';
import { getCategoryBrand } from '../design';
import { StickySectionHeader } from '@/components/StickyHeader';
// useScrollCollapse hooks available if needed
// import { useScrollEnd, useScrollHeader, useScrollHeaderDebounced } from '@/hooks/useScrollCollapse';
import { useCommandFavoritesStore } from '../stores/commandFavorites';
import { ReviewSummaryCard, WriteReview, ReviewPreview, ReviewSummarySkeleton, ReviewAISummary } from '../components/commands/reviews';

import {
  CommandHero,
  CommandStatsRow,
  CommandExamplesEnhanced,
  CommandParams,
  CommandChangelogEnhanced,
  CommandCommentsEnhanced,
  CommandRelatedEnhanced,
  CommandHowItWorks,
  CommandAliases,
  CommandScreenshots,
  CommandNavigation,
  BottomActionBar,
  CommandDetailSkeleton,
  CommandLivePreview,
  CommandSignals,
  CommandKnowledge,
} from '../components/commands/detail';

/* ─── Page animation variants ─── */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
} as const;

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
} as const;

const sectionVariant = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
} as const;

export default function BotCommandDetailPage() {
  const { command: slug, userId } = useParams();
  const navigate = useNavigate();
  const { haptic, webApp } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const { t: tUi } = useTranslation('ui');
  const { t: tReports } = useTranslation('reports');
  const showToast = useToastStore((s) => s.show);
  const { status: botStatus } = useBotStatus();
  const { user: appUser } = useUserStore();
  const currentUserId = appUser?.authTelegram?.id;

  const cmd = slug ? findCommand(slug) : undefined;
  const [stats, setStats] = useState<CommandStatsData | null>(null);
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggle: toggleFav, loaded: favLoaded, loadFavorites } = useCommandFavoritesStore();
  const mainSlug = cmd ? cmdSlug(cmd) : '';
  const isFav = favLoaded && isFavorite(mainSlug);
  const [showReportModal, setShowReportModal] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [showArgsInput, setShowArgsInput] = useState(false);
  const [argsValue, setArgsValue] = useState('');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const [highlightReview, setHighlightReview] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollY) {
      window.scrollTo(0, location.state.scrollY);
    }
  }, []);

  useEffect(() => { if (!favLoaded) loadFavorites(); }, [favLoaded, loadFavorites]);

  /* ── Scroll to review section when highlight=review ── */
  useEffect(() => {
    if (searchParams.get('highlight') !== 'review') return;
    // Wait for content to render
    const timer = setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightReview(true);
      setTimeout(() => setHighlightReview(false), 2500);
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!mainSlug) return;
    setLoading(true);
    Promise.allSettled([
      fetchCommandStats(mainSlug).then(setStats),
      fetchMyReportStatus(mainSlug).then((data) => {
        if (data.reported) setReported(true);
      }),
    ]).finally(() => setLoading(false));

    // Prefetch signals & knowledge
    queryClient.prefetchQuery({ queryKey: ['command-signals', mainSlug], queryFn: () => fetchCommandSignals(mainSlug), staleTime: 30_000 });
    queryClient.prefetchQuery({ queryKey: ['command-knowledge', mainSlug], queryFn: () => fetchCommandKnowledge(mainSlug), staleTime: 300_000 });
  }, [mainSlug, queryClient]);

  /* ── Reviews data (React Query) ── */
  const { data: reviewsSummary, isLoading: summaryLoading } = useQuery<ReviewsSummary>({
    queryKey: ['reviews-summary', mainSlug],
    queryFn: () => fetchReviewsSummary(mainSlug),
    enabled: !!mainSlug,
    staleTime: 30_000,
  });

  const { data: previewReviewsData } = useQuery({
    queryKey: ['reviews', mainSlug, 'preview'],
    queryFn: () => fetchReviews(mainSlug, 4, 0, 'relevant'),
    enabled: !!mainSlug,
    staleTime: 30_000,
  });
  const previewReviews: Review[] = previewReviewsData?.items ?? [];
  const totalReviewCount = previewReviewsData?.total ?? 0;

  const { data: myReviewData } = useQuery<{ review: MyReview | null }>({
    queryKey: ['my-review', mainSlug],
    queryFn: () => fetchMyReview(mainSlug),
    enabled: !!mainSlug,
    staleTime: 60_0000, // 
    // enable cache for my review since it's used in multiple places (mainly to avoid refetching when going to full reviews page)
    
  });
  const myReview = myReviewData?.review ?? null;

  /* ── Helpful toggle mutation ── */
  const helpfulMutation = useMutation({
    mutationFn: toggleReviewHelpful,
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', mainSlug, 'preview'] });
      queryClient.setQueryData(['reviews', mainSlug, 'preview'], (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((r: Review) =>
            r.id === reviewId
              ? { ...r, myHelpful: !r.myHelpful, helpfulCount: r.helpfulCount + (r.myHelpful ? -1 : 1) }
              : r,
          ),
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
      fetchCommandStats(mainSlug).then(setStats).catch(() => { });
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

  /* ── Submit/edit review ── */
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const handleSubmitReview = useCallback(async (rating: number, comment: string): Promise<any> => {
    setReviewSubmitting(true);
    try {
      const result = await submitRating(mainSlug, rating, comment);
      haptic?.notificationOccurred('success');
      if (result?.status === 'pending') {
        showToast(t('reviews_pending_toast'), 'info');
      } else {
        showToast(myReview ? t('reviews_updated') : t('reviews_published'), 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['reviews-summary', mainSlug] });
      queryClient.invalidateQueries({ queryKey: ['reviews', mainSlug] });
      queryClient.invalidateQueries({ queryKey: ['my-review', mainSlug] });
      // Also refresh stats since rating changed
      fetchCommandStats(mainSlug).then(setStats).catch(() => { });
      return true;
    } catch (error: any) {
      const key = error.error_key;
      showToast(key ? t(key) : t('error_system'), 'error');
      throw error;
    } finally {
      setReviewSubmitting(false);
    }
  }, [mainSlug, haptic, showToast, t, myReview, queryClient]);

  const handleRunInTelegram = useCallback(() => {
    if (!slug) return;

    // Si requiere argumentos y aún no hemos mostrado el input
    if (cmd?.requireArgs && !showArgsInput) {
      setShowArgsInput(true);
      haptic?.impactOccurred('light');
      return;
    }

    // Si no requiere args O ya tenemos el input visible y queremos enviar
    const finalArgs = argsValue.trim() ? `_${argsValue.trim().replace(/\s+/g, '_')}` : '';
    webApp?.openTelegramLink(`https://t.me/TrelkBot?start=${slug}${finalArgs}`);
    haptic?.impactOccurred('medium');

    // Opcional: limpiar después de enviar
    if (showArgsInput) setShowArgsInput(false);
  }, [slug, webApp, haptic, cmd?.requireArgs, showArgsInput, argsValue]);



  /* ─── Navigation helpers ─── */
  const currentIdx = cmd ? BOT_COMMANDS.findIndex((c) => cmdSlug(c) === cmdSlug(cmd)) : -1;
  const prevCmd = currentIdx > 0 ? BOT_COMMANDS[currentIdx - 1] : undefined;
  const nextCmd = currentIdx < BOT_COMMANDS.length - 1 ? BOT_COMMANDS[currentIdx + 1] : undefined;

  const goTo = useCallback((s: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${s}`, { replace: true });
  }, [navigate, userId, haptic]);

  const handleToggleFav = useCallback(async () => {
    haptic?.impactOccurred('light');
    const added = await toggleFav(mainSlug);
    showToast(added ? t('added_to_favorites') : t('removed_from_favorites'), 'info');
  }, [haptic, toggleFav, mainSlug, showToast, t]);

  const handleSeeAllReviews = useCallback(() => {
    navigate(`/users/ui/${userId}/bot-commands/${slug}/reviews`);
    haptic?.impactOccurred('light');
  }, [navigate, userId, slug, haptic]);

  const examples = useMemo(() => (mainSlug ? getExamples(mainSlug) : []), [mainSlug]);

  /* ─── Not found state ─── */
  if (!cmd) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center pt-24 px-5 text-center pb-28 max-w-[480px] mx-auto"
      >
        <div className="w-[72px] h-[72px] rounded-[24px] bg-tg-secondary border border-tg-border/40 flex items-center justify-center mb-5 shadow-sm">
          <AlertTriangle size={32} className="text-tg-hint/50" />
        </div>
        <h1 className="text-[20px] font-bold text-tg-text mb-2">{t('command_not_found')}</h1>
        <p className="text-tg-hint text-[14px] leading-relaxed">{t('command_not_registered', { slug })}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/users/ui/${userId}/bot-commands`, { replace: true })}
          className="mt-8 px-6 py-3.5 rounded-[16px] bg-tg-accent/10 text-tg-accent font-bold text-[15px] shadow-sm"
        >
          {t('back_to_directory')}
        </motion.button>
      </motion.div>
    );
  }

  /* ─── Loading skeleton ─── */
  if (loading && !stats) {
    return <CommandDetailSkeleton />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mainSlug}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="pb-28 relative max-w-[480px] mx-auto"
      >
        {/* ── Bot status warning ── */}
        {botStatus && botStatus !== 'online' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-5 mt-3 mb-1 px-4 py-3 rounded-[16px] flex items-center gap-3 text-[13px] font-medium ${botStatus === 'degraded'
              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
          >
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{tUi('command_status_warning')}</span>
          </motion.div>
        )}

        <CommandHero
          cmd={cmd}
          stats={stats}
          isFav={isFav}
          onToggleFav={handleToggleFav}
          onCollapseChange={setHeroCollapsed}
        />
        <div
          className="px-5 overflow-hidden will-change-[max-height,opacity] transition-[max-height,opacity] duration-150 ease-out"
          style={{ maxHeight: heroCollapsed ? 0 : 200, opacity: heroCollapsed ? 0 : 1 }}
        >
          {!showArgsInput ? (
            /* BOTÓN PRINCIPAL */
            <div className="mt-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRunInTelegram}
                className="w-full py-3.5 rounded-[18px] bg-tg-accent text-white text-[16px] font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-tg-accent/25 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0 pointer-events-none" />
                <Send size={18} className="fill-white/20 relative z-10" />
                <span className="relative z-10">{t('run_in_telegram')}</span>
              </motion.button>
            </div>
          ) : (
            /* INPUT DE ARGUMENTOS + BOTÓN SEND */
            <div className="mt-4 flex gap-2 items-center bg-tg-secondary/50 p-1.5 rounded-[20px] border border-tg-border/50 backdrop-blur-md">
              <input
                autoFocus
                type="text"
                value={argsValue}
                onChange={(e) => setArgsValue(e.target.value)}
                placeholder={cmd.usage.split(/\s/).slice(1).join(' ')}
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-tg-text text-[15px] focus:ring-0 placeholder:text-tg-hint/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunInTelegram();
                  if (e.key === 'Escape') setShowArgsInput(false);
                }}
              />
              <motion.button
                disabled={!argsValue.trim()}
                whileTap={{ scale: 0.9 }}
                onClick={handleRunInTelegram}
                className={`bg-tg-accent text-white p-2.5 rounded-[14px] shadow-md shadow-tg-accent/30 ${!argsValue.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Send size={20} />
              </motion.button>
              <button
                onClick={() => setShowArgsInput(false)}
                className="pr-2 text-tg-hint text-[12px] uppercase font-bold tracking-wider transition-colors hover:text-tg-hint/80"
              >
                {t('cancel', 'X')}
              </button>
            </div>
          )}
        </div>
        {/* ── Content sections with staggered entry ── */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="[overflow-x:clip]">
          {/* Stats Row */}
          {stats && (
            <motion.div variants={sectionVariant} className="mt-5">
              <CommandStatsRow stats={stats} />
            </motion.div>
          )}

          {/* Community Signals */}
          {mainSlug && (
            <motion.div variants={sectionVariant}>
              <CommandSignals slug={mainSlug} />
            </motion.div>
          )}

          {/* Aliases */}
          <motion.div variants={sectionVariant}>
            <CommandAliases aliases={cmd.name} />
          </motion.div>

          {/* Technical Details / Params */}
          <motion.div variants={sectionVariant}>
            <CommandParams cmd={cmd} />
          </motion.div>

          {/* Screenshots */}
          <motion.div variants={sectionVariant}>
            <CommandScreenshots photos={cmd.photos} />
          </motion.div>

          {/* How it works */}
          <motion.div variants={sectionVariant}>
            <CommandHowItWorks slug={mainSlug} usage={cmd.usage} />
          </motion.div>

          {/* Live Preview */}
          {/* {mainSlug && (
            <motion.div variants={sectionVariant}>
              <CommandLivePreview slug={mainSlug} supportsPreview={!!cmd.usage} />
            </motion.div>
          )} */}

          {/* Examples */}
          {examples.length > 0 && (
            <motion.div variants={sectionVariant}>
              <CommandExamplesEnhanced examples={examples} />
            </motion.div>
          )}

          {/* Changelog */}
          {mainSlug && (
            <motion.div variants={sectionVariant}>
              <CommandChangelogEnhanced slug={mainSlug} />
            </motion.div>
          )}

          {/* Knowledge Base
          {mainSlug && (
            <motion.div variants={sectionVariant}>
              <CommandKnowledge slug={mainSlug} />
            </motion.div>
          )} */}

          {/* Related Commands */}
          {mainSlug && (
            <motion.div variants={sectionVariant}>
              <CommandRelatedEnhanced slug={mainSlug} />
            </motion.div>
          )}

          {/* ── Reviews System (Google Play style) ── */}
          <motion.div variants={sectionVariant}>
            {summaryLoading ? (
              <ReviewSummarySkeleton />
            ) : reviewsSummary ? (
              <ReviewSummaryCard summary={reviewsSummary} />
            ) : null}
          </motion.div>

          {/* AI Summary */}
          {mainSlug && (
            <motion.div variants={sectionVariant}>
              <ReviewAISummary command={mainSlug} />
            </motion.div>
          )}

          <motion.div variants={sectionVariant}>
            <WriteReview
              initialRating={myReview?.rating}
              initialComment={myReview?.review}
              isEditing={!!myReview}
              loading={reviewSubmitting}
              disabled={myReview?.status === 'pending'}
              disabledReason={t('reviews_edit_blocked_pending')}
              onSubmit={handleSubmitReview}
              onDelete={handleDeleteReview}
            />
          </motion.div>

          <motion.div variants={sectionVariant} ref={reviewSectionRef} className={`transition-all duration-500 rounded-[20px] ${highlightReview ? 'ring-2 ring-tg-accent/40 bg-tg-accent/5' : ''}`}>
            <ReviewPreview
              isAdmin={appUser?.isAdmin}
              reviews={previewReviews}
              totalReviews={totalReviewCount}
              onSeeAll={handleSeeAllReviews}
              onToggleHelpful={handleToggleHelpful}
              currentUserId={currentUserId}
              onDelete={handleDeleteReview}
              onReport={handleReportReview}
            />
          </motion.div>

          {/* Feedback */}
          <motion.div variants={sectionVariant} className="px-5 mt-10">
            <div className="w-full h-px bg-tg-border/40 mb-8" />
            <CommandFeedback command={cmd.uniqueName!} />
          </motion.div>

          {/* Navigation */}
          <motion.div variants={sectionVariant}>
            <CommandNavigation prevCmd={prevCmd} nextCmd={nextCmd} onNavigate={goTo} />
          </motion.div>
        </motion.div>

        {/* ── Bottom Action Bar ── */}
        {/* Animation on scroll */}
        <AnimatePresence>
          {heroCollapsed && (
            <motion.div
              key="bottom-bar" // Key necesaria para AnimatePresence
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-[100] sm:hidden pointer-events-none`}
            >
              <div className="pointer-events-auto"> {/* Reactivamos clicks aquí */}
                <BottomActionBar
                  slug={mainSlug}
                  isFav={isFav}
                  reported={reported}
                  description={cmd.description}
                  onToggleFav={handleToggleFav}
                  onReport={() => {
                    setShowReportModal(true);
                    haptic?.impactOccurred('light');
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Report Modal ── */}
        <ReportErrorModal
          commandSlug={mainSlug}
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={() => {
            setReported(true);
            haptic?.notificationOccurred('success');
            showToast(tReports('report_sent'), 'success');
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}