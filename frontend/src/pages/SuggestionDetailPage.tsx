import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronUp, MessageCircle, Send, Shield, Loader2,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { useUserStore } from '../stores';
import {
  fetchSuggestion,
  fetchComments,
  toggleVote,
  addComment,
  updateSuggestionStatus,
  type SuggestionStatus,
} from '@/services/suggestionsApi';

const STATUS_STYLES: Record<SuggestionStatus, string> = {
  pending: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  reviewing: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  planned: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  in_progress: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  done: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  declined: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const ALL_STATUSES: SuggestionStatus[] = ['pending', 'reviewing', 'planned', 'in_progress', 'done', 'declined'];

export default function SuggestionDetailPage() {
  useHideIsland();
  const { id, userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('suggestions');
  const { haptic } = useTelegram();
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((s) => s.user?.isAdmin);

  const [commentText, setCommentText] = useState('');

  const { data: suggestion, isLoading } = useQuery({
    queryKey: ['suggestion', id],
    queryFn: () => fetchSuggestion(id!),
    enabled: !!id,
    staleTime: 15_000,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['suggestion-comments', id],
    queryFn: () => fetchComments(id!, 50, 0),
    enabled: !!id,
    staleTime: 15_000,
  });

  const voteMutation = useMutation({
    mutationFn: () => toggleVote(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['suggestion', id] });
      const prev = queryClient.getQueryData(['suggestion', id]);
      queryClient.setQueryData(['suggestion', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          myVote: !old.myVote,
          votesCount: old.votesCount + (old.myVote ? -1 : 1),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['suggestion', id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestion', id] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id!, content),
    onSuccess: () => {
      setCommentText('');
      haptic?.notificationOccurred('success');
      queryClient.invalidateQueries({ queryKey: ['suggestion-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['suggestion', id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SuggestionStatus) => updateSuggestionStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestion', id] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  if (isLoading || !suggestion) {
    return (
      <div className="pb-24 animate-fade-in">
        <div className="px-5 pt-5 space-y-4">
          <div className="h-8 w-8 rounded-full bg-tg-text/[0.05] animate-pulse" />
          <div className="h-6 w-3/4 bg-tg-text/[0.06] rounded animate-pulse" />
          <div className="h-4 w-full bg-tg-text/[0.04] rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-tg-text/[0.03] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const comments = commentsData?.items || [];

  return (
    <div className="pb-32 animate-fade-in">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-tg-bg backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-tg-border/20">
        <button
          onClick={() => navigate(`/users/ui/${userId}/labs`)}
          className="w-9 h-9 rounded-full bg-tg-text/[0.05] flex items-center justify-center text-tg-hint active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-[16px] font-bold text-tg-text truncate flex-1">{t('back')}</span>
      </div>

      <div className="px-5 mt-5">
        {/* ── Main Card ── */}
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 shadow-sm">
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${STATUS_STYLES[suggestion.status]}`}>
              {t(`status_${suggestion.status}`)}
            </span>
            {suggestion.userName && (
              <span className="text-[12px] text-tg-hint/60 font-medium">
                {t('suggested_by')} {suggestion.userName}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-[20px] font-extrabold text-tg-text leading-tight mb-3">
            {suggestion.title}
          </h1>

          {/* Description */}
          <p className="text-[14px] text-tg-hint/90 leading-relaxed whitespace-pre-wrap mb-5">
            {suggestion.description}
          </p>

          {/* Admin Note */}
          {suggestion.adminNote && (
            <div className="p-3.5 rounded-2xl bg-tg-accent/5 border border-tg-accent/15 mb-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield size={12} className="text-tg-accent" />
                <span className="text-[11px] font-bold text-tg-accent">{t('admin_note')}</span>
              </div>
              <p className="text-[13px] text-tg-text/80 leading-relaxed">{suggestion.adminNote}</p>
            </div>
          )}

          {/* Vote & Stats Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { haptic?.impactOccurred('light'); voteMutation.mutate(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-[14px] transition-all active:scale-95 ${
                suggestion.myVote
                  ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent'
                  : 'bg-tg-text/[0.03] border-tg-border/30 text-tg-hint hover:bg-tg-text/[0.06]'
              }`}
            >
              <ChevronUp size={18} strokeWidth={3} />
              <span>{suggestion.votesCount}</span>
              <span className="text-[12px] font-medium opacity-70">{t('votes')}</span>
            </button>

            <div className="flex items-center gap-1.5 text-tg-hint/60">
              <MessageCircle size={14} />
              <span className="text-[13px] font-medium">{suggestion.commentsCount} {t('comments')}</span>
            </div>
          </div>
        </div>

        {/* ── Admin Status Controls ── */}
        {isAdmin && (
          <div className="mt-4 p-4 bg-tg-secondary rounded-[20px] border border-tg-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-tg-accent" />
              <span className="text-[13px] font-bold text-tg-accent">Admin Controls</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { haptic?.impactOccurred('light'); statusMutation.mutate(s); }}
                  disabled={statusMutation.isPending}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                    suggestion.status === s
                      ? `${STATUS_STYLES[s]} ring-2 ring-offset-1 ring-offset-tg-bg`
                      : 'bg-tg-text/[0.03] border-tg-border/30 text-tg-hint/70'
                  }`}
                >
                  {t(`status_${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Comments Section ── */}
        <div className="mt-6">
          <h2 className="text-[16px] font-extrabold text-tg-text mb-4 flex items-center gap-2">
            <MessageCircle size={16} />
            {t('comments')} ({suggestion.commentsCount})
          </h2>

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[14px] text-tg-hint/50 font-medium">{t('empty_comments')}</p>
              <p className="text-[12px] text-tg-hint/30 mt-1">{t('be_first_comment')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {comments.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-2xl border ${
                      c.isAdmin
                        ? 'bg-tg-accent/5 border-tg-accent/15'
                        : 'bg-tg-secondary border-tg-border/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {c.userPhoto ? (
                        <img src={c.userPhoto} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-tg-text/[0.08]" />
                      )}
                      <span className="text-[12px] font-bold text-tg-text">{c.userName || 'User'}</span>
                      {c.isAdmin && (
                        <span className="text-[9px] font-extrabold text-tg-accent bg-tg-accent/10 px-1.5 py-0.5 rounded-full border border-tg-accent/20">
                          ADMIN
                        </span>
                      )}
                      <span className="text-[11px] text-tg-hint/40 ml-auto">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[13px] text-tg-text/80 leading-relaxed">{c.content}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Comment Input Bar (fixed bottom) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-tg-bg/95 backdrop-blur-xl border-t border-tg-border/30 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('comment_placeholder')}
            maxLength={1000}
            className="flex-1 h-11 px-4 rounded-full bg-tg-secondary border border-tg-border/30 text-[14px] text-tg-text placeholder:text-tg-hint/40 outline-none focus:border-tg-accent transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commentText.trim().length >= 3) {
                commentMutation.mutate(commentText.trim());
              }
            }}
          />
          <button
            onClick={() => {
              if (commentText.trim().length >= 3) {
                haptic?.impactOccurred('light');
                commentMutation.mutate(commentText.trim());
              }
            }}
            disabled={commentText.trim().length < 3 || commentMutation.isPending}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              commentText.trim().length >= 3
                ? 'bg-tg-accent text-white shadow-sm'
                : 'bg-tg-text/[0.05] text-tg-hint/40'
            }`}
          >
            {commentMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
