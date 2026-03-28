import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, Pencil, Globe, Trash2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';

interface Props {
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSubmit: (rating: number, comment: string) => Promise<any>;
  onDelete?: () => void;
  onCancel?: () => void;
}

const MAX_CHARS = 500;
const MIN_CHARS = 10;
const springTap = { type: 'spring' as const, stiffness: 400, damping: 17 };

function WriteReview({ initialRating = 0, initialComment = '', isEditing, loading, disabled, disabledReason, onSubmit, onDelete, onCancel }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialRating > 0) setRating(initialRating);
    if (initialComment) setComment(initialComment);
  }, [initialRating, initialComment]);

  // Rating >= 1 is enough. Comment is optional but if provided must be >= MIN_CHARS
  const commentTrimmed = comment.trim();
  const commentValid = commentTrimmed.length === 0 || (commentTrimmed.length >= MIN_CHARS && commentTrimmed.length <= MAX_CHARS);
  const isValid = rating >= 1 && commentValid;

  const handleStarClick = useCallback((n: number) => {
    haptic?.impactOccurred('light');
    setRating(n);
    if (!expanded) setExpanded(true);
  }, [haptic, expanded]);

  const handleSubmit = useCallback(() => {
    if (!isValid || loading) return;
    onSubmit(rating, commentTrimmed).then(() => {
      haptic?.notificationOccurred('success');
      setSubmitted(true);
      setTimeout(() => {
        setExpanded(false);
        setSubmitted(false);
      }, 2000);
    }).catch((error) => {
      console.log('Failed to submit review:', error);
      haptic?.notificationOccurred('error');
    });
  }, [isValid, loading, haptic, onSubmit, rating, commentTrimmed]);

  const handleCancel = useCallback(() => {
    setExpanded(false);
    if (!isEditing) { setRating(initialRating); setComment(initialComment); }
    onCancel?.();
  }, [isEditing, initialRating, initialComment, onCancel]);

  // Show success animation
  if (submitted) {
    return (
      <section className="px-5 mt-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onAnimationComplete={() => {
            import('../../../lib/delight').then(({ smallConfetti }) => smallConfetti());
          }}
          className="bg-emerald-500/10 backdrop-blur-sm rounded-[20px] border border-emerald-500/30 p-6 text-center"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
          </motion.div>
          <p className="text-[15px] font-bold text-tg-text">
            {isEditing ? t('reviews_updated') : t('reviews_published')}
          </p>
          <p className="text-[12px] text-tg-hint mt-1">{t('reviews_thanks')}</p>
        </motion.div>
      </section>
    );
  }

  // Collapsed view for existing reviews
  if (isEditing && !expanded) {
    return (
      <section className="px-5 mt-6">
        <div className={`bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 shadow-sm ${disabled ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[14px] font-bold text-tg-text">{t('reviews_your_review')}</h4>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} className={n <= rating ? 'text-amber-500 fill-amber-500' : 'text-tg-hint/20'} />
                ))}
              </div>
              {initialComment && (
                <p className="text-[12px] text-tg-hint mt-1 line-clamp-1">{initialComment}</p>
              )}
              {disabled && disabledReason && (
                <p className="text-[11px] text-amber-500 mt-1.5">{disabledReason}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { haptic?.impactOccurred('light'); onDelete(); }}
                  className="p-2 rounded-full text-red-500/60 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => !disabled && setExpanded(true)}
                disabled={disabled}
                className={`px-3.5 py-2 rounded-[12px] text-[12px] font-semibold flex items-center gap-1.5 ${disabled ? 'bg-tg-hint/10 text-tg-hint cursor-not-allowed' : 'bg-tg-accent/10 text-tg-accent'}`}
              >
                <Pencil size={12} />
                {t('reviews_edit_btn')}
              </motion.button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 mt-6">
      <div className="bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h4 className="text-[14px] font-bold text-tg-text mb-3">
            {isEditing ? t('reviews_edit_title') : t('reviews_write_title')}
          </h4>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                transition={springTap}
                onClick={() => handleStarClick(n)}
                className="w-11 h-11 rounded-[12px] bg-tg-hint/5 border border-tg-border/30 flex items-center justify-center transition-colors hover:bg-amber-500/10 hover:border-amber-500/30 active:shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                <Star
                  size={22}
                  className={`transition-colors ${n <= rating ? 'text-amber-500 fill-amber-500' : 'text-tg-hint/30'
                    }`}
                />
              </motion.button>
            ))}
          </div>

          {/* Expandable form */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {/* Public badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-tg-accent/5 border border-tg-accent/15 mb-3">
                  <Globe size={13} className="text-tg-accent flex-shrink-0" />
                  <span className="text-[11px] text-tg-hint leading-tight">{t('reviews_public_notice')}</span>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, MAX_CHARS))}
                    placeholder={t('reviews_placeholder')}
                    rows={3}
                    className="w-full bg-tg-bg/60 border border-tg-border/40 rounded-[14px] px-3.5 py-2.5 text-[14px] text-tg-text placeholder:text-tg-hint/40 resize-none focus:outline-none focus:border-2 focus:border-tg-accent/70 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className={`text-[11px] tabular-nums ${comment.length > MAX_CHARS ? 'text-red-500' : comment.length > 0 && comment.length < MIN_CHARS ? 'text-amber-500' : 'text-tg-hint/50'
                      }`}>
                      {comment.length}/{MAX_CHARS}
                    </span>
                    {comment.length > 0 && comment.length < MIN_CHARS && (
                      <span className="text-[11px] text-amber-500">
                        {t('reviews_min_chars', { count: MIN_CHARS - comment.length })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={springTap}
                    onClick={handleCancel}
                    className="flex-1 py-2.5 rounded-[14px] text-[13px] font-semibold text-tg-hint border border-tg-border/40"
                  >
                    {t('reviews_cancel')}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={springTap}
                    disabled={!isValid || loading}
                    onClick={handleSubmit}
                    className="flex-1 py-2.5 rounded-[14px] text-[13px] font-bold bg-tg-accent text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-tg-accent/20 active:shadow-[0_0_12px_rgba(var(--tg-accent-rgb,59,130,246),0.35)]"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        {isEditing ? t('reviews_update') : t('reviews_publish')}
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit rating-only button (when form not expanded and rating selected) */}
          {!expanded && rating >= 1 && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              onClick={handleSubmit}
              className="w-full mt-2 py-2.5 rounded-[14px] text-[13px] font-bold bg-tg-accent text-white flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm shadow-tg-accent/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} />{t('reviews_publish')}</>}
            </motion.button>
          )}
        </div>
        {/* Legal notice */}
        <p className="text-[11px] text-tg-hint mt-4">
          {t('reviews_legal_notice', "All reviews are public and visible to everyone. Please follow our community guidelines when writing your review.")}
        </p>

      </div>
    </section>
  );
}

export default memo(WriteReview);
