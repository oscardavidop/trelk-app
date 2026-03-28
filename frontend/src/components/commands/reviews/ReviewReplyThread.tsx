import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Shield, MoreVertical, Pencil, Trash2, EyeOff, Eye, ThumbsUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';
import {
  fetchReplies, submitReply, deleteReply, editReply, hideReply, toggleReplyHelpful,
  type ReviewReply,
} from '../../../services/commandStatsApi';

interface Props {
  reviewId: string;
  repliesCount: number;
  isAdmin?: boolean;
  forceOpen?: boolean;
}

const springPop = { type: 'spring' as const, stiffness: 400, damping: 22 };

function ReviewReplyThread({ reviewId, repliesCount, isAdmin, forceOpen }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['replies', reviewId],
    queryFn: () => fetchReplies(reviewId, 20, 0),
    enabled: !!forceOpen,
    staleTime: 60_000,
  });

  const replies: ReviewReply[] = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const replyMutation = useMutation({
    mutationFn: (content: string) => submitReply(reviewId, content),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      setText('');
      qc.invalidateQueries({ queryKey: ['replies', reviewId] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (replyId: string) => deleteReply(replyId),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      qc.invalidateQueries({ queryKey: ['replies', reviewId] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => editReply(id, content),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      setEditingId(null);
      setEditText('');
      qc.invalidateQueries({ queryKey: ['replies', reviewId] });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (replyId: string) => hideReply(replyId),
    onSuccess: () => {
      haptic?.impactOccurred('light');
      qc.invalidateQueries({ queryKey: ['replies', reviewId] });
    },
  });

  const helpfulMutation = useMutation({
    mutationFn: (replyId: string) => toggleReplyHelpful(replyId),
    onMutate: async (replyId: string) => {
      await qc.cancelQueries({ queryKey: ['replies', reviewId] });
      qc.setQueryData(['replies', reviewId], (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((r: ReviewReply) =>
            r.id === replyId
              ? { ...r, myHelpful: !r.myHelpful, helpfulCount: (r.helpfulCount ?? 0) + (r.myHelpful ? -1 : 1) }
              : r,
          ),
        };
      });
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || replyMutation.isPending) return;
    replyMutation.mutate(trimmed);
  }, [text, replyMutation]);

  const handleEditSubmit = useCallback((replyId: string) => {
    const trimmed = editText.trim();
    if (trimmed.length < 2 || editMutation.isPending) return;
    editMutation.mutate({ id: replyId, content: trimmed });
  }, [editText, editMutation]);

  const startEdit = useCallback((reply: ReviewReply) => {
    setEditingId(reply.id);
    setEditText(reply.content);
    setMenuOpenId(null);
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  return (
    <div className="pl-12 mt-2">
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="overflow-hidden"
      >
        {/* Replies list */}
        {(repliesCount > 0 || replies.length > 0) && (
          <div className="mt-1 space-y-2.5 border-l-2 border-tg-border/20 pl-3">
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin text-tg-hint" />
                <span className="text-[12px] text-tg-hint">{t('reviews_replies_loading')}</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {replies.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, x: -8, scale: 0.97 }}
                    animate={{ opacity: r.isHidden ? 0.45 : 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.97 }}
                    transition={springPop}
                    className={`flex gap-2.5 group relative ${r.isHidden ? 'border-l-2 border-dashed border-amber-500/30 pl-2 -ml-2' : ''}`}
                  >
                    {r.userPhoto ? (
                      <img src={r.userPhoto} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-tg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-tg-accent">
                          {r.userName ? r.userName.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-tg-text truncate">
                          {r.userName || t('reviews_user', { id: r.userId })}
                        </span>
                        {r.isAdmin && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-tg-accent/15 text-tg-accent border border-tg-accent/20">
                            <Shield size={8} />
                            {t('reviews_reply_admin')}
                          </span>
                        )}
                        <span className="text-[10px] text-tg-hint">{formatDate(r.createdAt)}</span>
                        {r.isEdited && (
                          <span className="text-[9px] text-tg-hint/60 italic flex items-center gap-0.5">
                            <Pencil size={7} />
                            {t('reviews_reply_edited', 'edited')}
                          </span>
                        )}
                        {r.isHidden && (
                          <span className="text-[9px] text-amber-500/70 flex items-center gap-0.5">
                            <EyeOff size={7} />
                            {t('reviews_reply_hidden', 'hidden')}
                          </span>
                        )}

                        {/* Admin 3-dot menu per reply */}
                        {isAdmin && (
                          <div className="relative ml-auto" ref={menuOpenId === r.id ? menuRef : undefined}>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              transition={springPop}
                              onClick={() => { haptic?.impactOccurred('light'); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                              className="p-0.5 text-tg-hint/40 rounded-full hover:bg-tg-hint/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={12} />
                            </motion.button>

                            <AnimatePresence>
                              {menuOpenId === r.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 top-full mt-1 bg-tg-bg border border-tg-border/50 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]"
                                >
                                  <button
                                    onClick={() => startEdit(r)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-tg-text hover:bg-tg-secondary/50 transition-colors"
                                  >
                                    <Pencil size={12} className="text-tg-hint" />
                                    {t('reviews_reply_edit', 'Edit')}
                                  </button>
                                  <button
                                    onClick={() => { setMenuOpenId(null); hideMutation.mutate(r.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-amber-600 hover:bg-amber-500/5 transition-colors"
                                  >
                                    {r.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                                    {r.isHidden ? t('reviews_reply_show', 'Show') : t('reviews_reply_hide', 'Hide')}
                                  </button>
                                  <button
                                    onClick={() => { setMenuOpenId(null); deleteMutation.mutate(r.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-500/5 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    {t('reviews_reply_delete', 'Delete')}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Content or edit mode */}
                      {editingId === r.id ? (
                        <div className="mt-1 flex gap-1.5 items-end">
                          <input
                            value={editText}
                            onChange={e => setEditText(e.target.value.slice(0, 500))}
                            className="flex-1 bg-tg-bg/60 border border-tg-accent/40 rounded-lg px-2.5 py-1.5 text-[12px] text-tg-text focus:border-2 focus:outline-none focus:border-tg-accent/60"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit(r.id); if (e.key === 'Escape') setEditingId(null); }}
                          />
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            transition={springPop}
                            disabled={editText.trim().length < 2 || editMutation.isPending}
                            onClick={() => handleEditSubmit(r.id)}
                            className="p-1.5 rounded-lg bg-tg-accent text-white disabled:opacity-40"
                          >
                            {editMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            transition={springPop}
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg text-tg-hint border border-tg-border/40 text-[11px]"
                          >
                            ✕
                          </motion.button>
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-tg-text/85 leading-[1.45] mt-0.5">{r.content}</p>
                      )}

                      {/* Helpful button for replies */}
                      {!editingId && r.isAdmin && (
                        <div className="flex items-center gap-2 mt-1">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            transition={springPop}
                            onClick={() => { haptic?.impactOccurred('light'); helpfulMutation.mutate(r.id); }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                              r.myHelpful
                                ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent'
                                : 'bg-transparent border-tg-border/30 text-tg-hint hover:border-tg-accent/20'
                            }`}
                          >
                            <ThumbsUp size={10} className={r.myHelpful ? 'fill-tg-accent' : ''} />
                            {(r.helpfulCount ?? 0) > 0 && <span>{r.helpfulCount}</span>}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {hasMore && !isLoading && (
              <button
                onClick={() => {}}
                className="text-[11px] text-tg-accent font-medium"
              >
                {t('reviews_replies_load_more')}
              </button>
            )}
          </div>
        )}

        {/* Reply input — admin only */}
        {isAdmin && (
          <div className="mt-3 flex gap-2 items-end">
            <input
              value={text}
              onChange={e => setText(e.target.value.slice(0, 500))}
              placeholder={t('reviews_reply_placeholder')}
              className="flex-1 bg-tg-bg/60 border border-tg-border/40 rounded-xl px-3 py-2 text-[13px] text-tg-text placeholder:text-tg-hint/40 focus:border-2 focus:outline-none focus:border-tg-accent/50"
            />
            <motion.button
              whileTap={{ scale: 0.85 }}
              transition={springPop}
              disabled={text.trim().length < 2 || replyMutation.isPending}
              onClick={handleSubmit}
              className="p-2.5 rounded-xl bg-tg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {replyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default memo(ReviewReplyThread);
