import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Star, ThumbsUp, MoreVertical, ChevronDown, Pencil, Trash2, Flag, MessageCircle, Shield, Zap, UserCircle, Terminal, Clock, XCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';
import type { Review, ReviewBadge } from '../../../services/commandStatsApi';
import ReviewReplyThread from './ReviewReplyThread';
import UserBadge from '../../ui/UserBadge';

interface Props {
  review: Review;
  isOwn?: boolean;
  isAdmin?: boolean;
  onToggleHelpful?: (reviewId: string) => void;
  onEdit?: () => void;
  onDelete?: (reviewId: string) => void;
  onAdminDelete?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
}

const SWIPE_THRESHOLD = 60;
const springTap = { type: 'spring' as const, stiffness: 400, damping: 17 };

const BADGE_CONFIG: Record<ReviewBadge, { icon: typeof Shield; color: string; bg: string }> = {
  power_user: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  active_user: { icon: Shield, color: 'text-tg-accent', bg: 'bg-tg-accent/10 border-tg-accent/20' },
  new_user: { icon: UserCircle, color: 'text-tg-hint', bg: 'bg-tg-hint/10 border-tg-hint/20' },
};

function ReviewCard({ review, isOwn, isAdmin, onToggleHelpful, onEdit, onDelete, onAdminDelete, onReport }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<'helpful' | 'not' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLong = review.review && review.review.length > 180;

  // Swipe gestures
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], [0.15, 0, 0.15]);
  const bgColor = useTransform(x, (v) => v > 0 ? 'rgba(34,197,94,0.15)' : v < 0 ? 'rgba(239,68,68,0.1)' : 'transparent');

  const handleSwipeEnd = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) >= SWIPE_THRESHOLD) {
      const isPositive = info.offset.x > 0;
      haptic?.impactOccurred('medium');
      onToggleHelpful?.(review.id);
      setSwipeFeedback(isPositive ? 'helpful' : 'not');
      setTimeout(() => setSwipeFeedback(null), 1200);
    }
  }, [review.id, onToggleHelpful, haptic]);

  const handleHelpful = useCallback(() => {
    haptic?.impactOccurred('light');
    onToggleHelpful?.(review.id);
  }, [review.id, onToggleHelpful, haptic]);

  const handleReplyToggle = useCallback(() => {
    haptic?.impactOccurred('light');
    setReplyOpen(v => !v);
  }, [haptic]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const displayName = review.userName || t('reviews_user', { id: review.userId });
  const initial = review.userName
    ? review.userName.charAt(0).toUpperCase()
    : `U${String(review.userId).slice(-2)}`;

  const badge = review.badge && BADGE_CONFIG[review.badge];
  const hasReplies = (review.repliesCount ?? 0) > 0;
  const isPending = review.status === 'pending';
  const isRejected = review.status === 'rejected';


  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isPending ? 0.65 : 1, y: 0 }}
      className={`py-4 border-b border-tg-border/20 last:border-0 relative overflow-hidden ${isRejected ? 'opacity-50' : ''}`}
    >
      {/* Moderation status banner */}
      {isPending && isOwn && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Clock size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11.5px] text-amber-600 font-medium">{t('reviews_pending', 'Your review is being moderated')}</span>
        </div>
      )}
      {isRejected && isOwn && (
        <div className="mb-2 flex flex-col gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <XCircle size={13} className="text-red-500 shrink-0" />
            <span className="text-[11.5px] text-red-500 font-medium">{t('reviews_rejected')}</span>
          </div>
          <span className="text-[11px] text-red-400/80 pl-[21px]">
            {t((review as any).moderationRejectionKey || 'policy_violation')}
          </span>
        </div>
      )}
      {/* Swipe background indicator */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ backgroundColor: bgColor, opacity: bgOpacity }}
      />

      {/* Swipe feedback toast */}
      <AnimatePresence>
        {swipeFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-2 right-3 text-[11px] font-medium px-2.5 py-1 rounded-full z-10 ${
              swipeFeedback === 'helpful'
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {swipeFeedback === 'helpful' ? '👍' : '👎'}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipeEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {review.userPhoto ? (
              <img
                src={review.userPhoto}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-tg-border/30 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tg-accent/30 to-tg-accent/10 flex items-center justify-center shrink-0 border border-tg-border/30">
                <span className="text-[12px] font-bold text-tg-accent">{initial}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-tg-text leading-tight">
                  {displayName}
                </span>
                {/* Badge chip */}
                {badge && review.badge !== 'new_user' && (
                  <UserBadge
                    badge={review.badge}
                    isAdmin={review.isAdmin}
                    isVerified={review.isVerified}
                    isTrustedUser={review.isTrustedUser}
                  />
                )}
                {/* Trust badges */}
                {review.isVerified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                    <CheckCircle size={9} />
                    {t('reviews_verified', 'Verified')}
                  </span>
                )}
                {review.isTrustedUser && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-500">
                    <Zap size={9} />
                    {t('reviews_trusted', 'Trusted')}
                  </span>
                )}
                {review.isAIModerated && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-500">
                    <Sparkles size={9} />
                    {t('reviews_ai_filtered', 'AI Filtered')}
                  </span>
                )}
                {
                  isRejected && (
                    <span className="text-[11px] text-red-500 italic flex items-center gap-0.5">
                      <XCircle size={8} />
                      Only you can see this review.
                    </span>
                  )
                }
              </div>
              {/* Stars + date */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex gap-[2px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={11}
                      className={n <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-tg-hint/20'}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-tg-hint">{formatDate(review.date)}</span>
                {review.isEdited && (
                  <span className="text-[10px] text-tg-hint/60 italic flex items-center gap-0.5">
                    <Pencil size={8} />
                    {t('reviews_edited')}
                  </span>
                )}
                {review.isSuspicious && (
                  <span className="text-[10px] text-amber-500/70 italic">⚠</span>
                )}
              </div>
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <motion.button
              whileTap={{ scale: 0.85 }}
              transition={springTap}
              onClick={() => { haptic?.impactOccurred('light'); setMenuOpen(!menuOpen); }}
              className="p-1.5 text-tg-hint rounded-full hover:bg-tg-hint/10 active:shadow-[0_0_8px_rgba(var(--tg-accent-rgb,59,130,246),0.3)] transition-colors"
            >
              <MoreVertical size={16} />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-tg-bg border border-tg-border/50 rounded-[14px] shadow-xl z-50 overflow-hidden min-w-[160px]"
                >
                  {isOwn && onEdit && (
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-tg-text hover:bg-tg-secondary/50 transition-colors"
                    >
                      <Pencil size={14} className="text-tg-hint" />
                      {t('reviews_edit_btn')}
                    </button>
                  )}
                  {isOwn && onDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(review.id); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t('reviews_delete')}
                    </button>
                  )}
                  {isAdmin && !isOwn && onAdminDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); onAdminDelete(review.id); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t('reviews_admin_delete', 'Delete (Admin)')}
                    </button>
                  )}
                  {!isOwn && onReport && (
                    <button
                      onClick={() => { setMenuOpen(false); onReport(review.id); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-amber-600 hover:bg-amber-500/5 transition-colors"
                    >
                      <Flag size={14} />
                      {t('reviews_report_spam')}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Command context */}
        {review.commandContext?.args && (
          <div className="mt-2 pl-12">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tg-secondary/50 border border-tg-border/20">
              <Terminal size={11} className="text-tg-hint" />
              <span className="text-[11px] text-tg-hint font-mono">{review.commandContext.args}</span>
            </div>
          </div>
        )}

        {/* Comment text */}
        {review.review && (
          <div className="mt-2.5 pl-12">
            <p className={`text-[13.5px] leading-[1.5] text-tg-text/90 ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
              {review.review}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[12px] text-tg-accent font-medium mt-1 flex items-center gap-0.5"
              >
                {expanded ? t('reviews_show_less') : t('reviews_show_more')}
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}


        {/* Bottom: helpful */}
        <div className="mt-3 flex items-center gap-4 pl-12">
          {review.helpfulCount > 0 && (
            <span className="text-[11px] text-tg-hint">
              {t('reviews_helpful_count', { count: review.helpfulCount })}
            </span>
          )}
          <span className="text-[11px] text-tg-hint">{t('reviews_was_helpful')}</span>
          <div className="flex items-center gap-1">
            <AnimatePresence mode="wait">
              <motion.button
                key={review.myHelpful ? 'voted' : 'unvoted'}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.85 }}
                transition={springTap}
                onClick={handleHelpful}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                  review.myHelpful
                    ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent shadow-[0_0_6px_rgba(var(--tg-accent-rgb,59,130,246),0.2)]'
                    : 'bg-transparent border-tg-border/40 text-tg-hint hover:border-tg-accent/30'
                }`}
              >
                <ThumbsUp size={12} className={`inline mr-1 ${review.myHelpful ? 'fill-tg-accent' : ''}`} />
                {t('reviews_yes')}
              </motion.button>
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.85 }}
              transition={springTap}
              onClick={handleHelpful}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-tg-border/40 text-tg-hint hover:border-tg-hint/60"
            >
              {t('reviews_no')}
            </motion.button>
          </div>
        </div>

        {/* Reply section — toggle + thread */}
        {(hasReplies || isAdmin) && (
          <div className="mt-2 pl-12">
            <button
              onClick={handleReplyToggle}
              className="flex items-center gap-1.5 text-[12px] text-tg-accent font-medium"
            >
              <MessageCircle size={13} />
              {hasReplies
                ? (replyOpen ? t('reviews_replies_hide') : t('reviews_replies_count', { count: review.repliesCount }))
                : t('reviews_reply_btn', 'Reply')
              }
              {hasReplies && (
                <ChevronDown size={12} className={`transition-transform ${replyOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Reply thread (inside card) */}
      <AnimatePresence>
        {replyOpen && (
          <ReviewReplyThread
            reviewId={review.id}
            repliesCount={review.repliesCount ?? 0}
            isAdmin={isAdmin}
            forceOpen
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(ReviewCard);
