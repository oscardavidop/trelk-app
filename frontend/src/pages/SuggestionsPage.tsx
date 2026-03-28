import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Plus, ChevronUp, MessageCircle, TrendingUp, ArrowUpDown, Clock, Sparkles } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { useUserStore } from '../stores';
import StickyHeader from '@/components/StickyHeader';
import {
  fetchSuggestions,
  toggleVote,
  type SuggestionItem,
  type SortMode,
  type SuggestionStatus,
} from '@/services/suggestionsApi';
import CreateSuggestionModal from '@/components/suggestions/CreateSuggestionModal';

const STATUS_STYLES: Record<SuggestionStatus, string> = {
  pending: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  reviewing: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  planned: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  in_progress: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  done: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  declined: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const SORT_OPTIONS: { key: SortMode; icon: typeof TrendingUp }[] = [
  { key: 'trending', icon: TrendingUp },
  { key: 'top', icon: ArrowUpDown },
  { key: 'new', icon: Clock },
];

export default function SuggestionsPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('suggestions');
  const { haptic } = useTelegram();
  const queryClient = useQueryClient();

  const [sort, setSort] = useState<SortMode>('trending');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', sort],
    queryFn: () => fetchSuggestions(sort, 20, 0),
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => toggleVote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['suggestions'] });
      const prev = queryClient.getQueryData(['suggestions', sort]);
      queryClient.setQueryData(['suggestions', sort], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((s: SuggestionItem) =>
            s.id === id
              ? { ...s, myVote: !s.myVote, votesCount: s.votesCount + (s.myVote ? -1 : 1) }
              : s,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['suggestions', sort], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const handleVote = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    haptic?.impactOccurred('light');
    voteMutation.mutate(id);
  }, [haptic, voteMutation]);

  const items = data?.items || [];

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<Lightbulb className="w-6 h-6 text-amber-500 fill-amber-500/20" />}
      >
        {/* ── Sort Tabs ── */}
        <div className="px-4 pt-3 flex items-center gap-2">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => { haptic?.impactOccurred('light'); setSort(opt.key); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-extrabold transition-all active:scale-95 border ${
                  active
                    ? 'bg-tg-accent/10 text-tg-accent border-tg-accent/20'
                    : 'bg-tg-text/[0.03] text-tg-hint border-tg-border/30 hover:bg-tg-text/[0.06]'
                }`}
              >
                <Icon size={13} />
                {t(`sort_${opt.key}`)}
              </button>
            );
          })}
        </div>
      </StickyHeader>

      {/* ── Content ── */}
      <section className="px-5 mt-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-16 rounded-xl bg-tg-text/[0.05]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-tg-text/[0.05] rounded" />
                    <div className="h-3 w-full bg-tg-text/[0.04] rounded" />
                    <div className="h-3 w-1/2 bg-tg-text/[0.03] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState t={t} onCreateClick={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  index={index}
                  t={t}
                  onVote={handleVote}
                  onClick={() => navigate(`/users/ui/${userId}/labs/${item.id}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── FAB ── */}
      <button
        onClick={() => { haptic?.impactOccurred('medium'); setShowCreate(true); }}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-tg-accent text-white shadow-lg shadow-tg-accent/25 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <CreateSuggestionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ['suggestions'] });
        }}
      />
    </div>
  );
}

// ── SuggestionCard ─────────────────────────────

function SuggestionCard({
  item,
  index,
  t,
  onVote,
  onClick,
}: {
  item: SuggestionItem;
  index: number;
  t: (k: string) => string;
  onVote: (e: React.MouseEvent, id: string) => void;
  onClick: () => void;
}) {
  const statusKey = `status_${item.status}` as const;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={onClick}
      className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex gap-3 p-4">
        {/* Vote Column */}
        <button
          onClick={(e) => onVote(e, item.id)}
          className={`flex flex-col items-center justify-center min-w-[52px] py-2.5 rounded-2xl border transition-all active:scale-90 ${
            item.myVote
              ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent'
              : 'bg-tg-text/[0.03] border-tg-border/30 text-tg-hint hover:bg-tg-text/[0.06]'
          }`}
        >
          <ChevronUp size={18} strokeWidth={3} className={item.myVote ? 'text-tg-accent' : ''} />
          <span className="text-[14px] font-extrabold leading-none mt-0.5">{item.votesCount}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[15px] font-bold text-tg-text leading-snug line-clamp-2">
              {item.title}
            </h3>
          </div>

          <p className="text-[13px] text-tg-hint/80 leading-relaxed line-clamp-2 mb-2.5">
            {item.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[item.status]}`}>
              {t(statusKey)}
            </span>
            {item.commentsCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-tg-hint/70 font-medium">
                <MessageCircle size={11} /> {item.commentsCount}
              </span>
            )}
            {item.userName && (
              <span className="text-[11px] text-tg-hint/50 font-medium truncate max-w-[120px]">
                {item.userName}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── EmptyState ─────────────────────────────────

function EmptyState({ t, onCreateClick }: { t: (k: string) => string; onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6"
    >
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={36} className="text-amber-500" />
        </div>
      </div>
      <h3 className="text-[18px] font-extrabold text-tg-text mb-2">{t('no_suggestions')}</h3>
      <p className="text-[14px] text-tg-hint/70 mb-6 max-w-[260px] mx-auto leading-relaxed">
        {t('no_suggestions_desc')}
      </p>
      <button
        onClick={onCreateClick}
        className="px-6 py-3 rounded-[14px] bg-tg-accent/10 text-tg-accent font-bold text-[14px] border border-tg-accent/20 active:scale-95 transition-all"
      >
        <Plus size={16} className="inline mr-1.5 -mt-0.5" />
        {t('new_suggestion')}
      </button>
    </motion.div>
  );
}
