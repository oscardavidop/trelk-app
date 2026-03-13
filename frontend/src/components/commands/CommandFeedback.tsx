import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import {
  fetchMyFeedback,
  submitFeedback,
  type FeedbackReason,
} from '../../services/commandFeedbackApi';

interface CommandFeedbackProps {
  command: string;
}

const REASONS: { key: FeedbackReason; labelKey: string }[] = [
  { key: 'didnt_work', labelKey: 'didnt_work' },
  { key: 'too_slow',   labelKey: 'too_slow' },
  { key: 'bad_results', labelKey: 'bad_results' },
  { key: 'confusing',  labelKey: 'confusing' },
];

export default function CommandFeedback({ command }: CommandFeedbackProps) {
  const { t } = useTranslation('feedback');

  const [loadState, setLoadState] = useState<'loading' | 'ready'>('loading');
  const [vote, setVote]           = useState<'yes' | 'no' | null>(null);
  const [selected, setSelected]   = useState<FeedbackReason[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing]     = useState(false);

  // ── Load existing feedback on mount ─────────────────────────────────
  useEffect(() => {
    setLoadState('loading');
    fetchMyFeedback(command)
      .then((data) => {
        if (data.feedback === 'useful') {
          setVote('yes');
          setSubmitted(true);
        } else if (data.feedback === 'not_useful') {
          setVote('no');
          setSubmitted(true);
        } else if (data.rating != null) {
          // Fallback: infer from numeric star rating
          setVote(data.rating >= 4 ? 'yes' : 'no');
          setSubmitted(true);
        }
      })
      .catch(() => { /* not yet rated — fresh state */ })
      .finally(() => setLoadState('ready'));
  }, [command]);

  const handleVote = async (v: 'yes' | 'no') => {
    if (submitting) return;
    setVote(v);

    if (v === 'yes') {
      setSubmitting(true);
      try { await submitFeedback(command, { useful: true }); } catch { /* ignore */ }
      setSubmitted(true);
      setEditing(false);
      setSubmitting(false);
    }
  };

  const toggleReason = (key: FeedbackReason) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSubmitReasons = async () => {
    if (submitting || selected.length === 0) return;
    setSubmitting(true);
    try {
      await submitFeedback(command, { useful: false, reason: selected[0] });
    } catch { /* ignore */ }
    setSubmitted(true);
    setEditing(false);
    setSubmitting(false);
  };

// ── Loading skeleton ────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div className="rounded-[18px] bg-tg-secondary border border-tg-border/50 p-5 flex items-center justify-center h-16">
        <Loader2 size={20} className="animate-spin text-tg-hint/40" />
      </div>
    );
  }

  // ── Already submitted (show confirmation + edit option) ──────────────
  if (submitted && !editing) {
    return (
      <div className="rounded-[18px] bg-tg-secondary border border-tg-border/50 p-5 flex items-center gap-3 animate-fade-in shadow-sm">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          vote === 'yes'
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {vote === 'yes'
            ? <ThumbsUp size={18} className="text-green-400" />
            : <ThumbsDown size={18} className="text-red-400" />}
        </div>
        <p className="flex-1 text-[14px] font-semibold text-tg-text">{t('thanks')}</p>
        {/* <button
          onClick={() => { setEditing(true); setSubmitted(false); }}
          className="text-[12px] text-tg-accent font-semibold px-3 py-1.5 rounded-full bg-tg-accent/10 hover:bg-tg-accent/15 active:scale-95 transition-all"
        >
          {t('edit')}
        </button> */}
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm animate-fade-in">

      {/* ── Question ── */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[14px] font-semibold text-tg-text/90">{t('useful')}</p>
      </div>

      {/* ── Thumbs row ── */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => handleVote('yes')}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[14px] font-semibold border transition-all active:scale-95 disabled:opacity-60 ${
            vote === 'yes'
              ? 'bg-green-500/15 border-green-500/30 text-green-400'
              : 'bg-tg-surface border-tg-border/40 text-tg-hint hover:text-tg-text'
          }`}
          aria-pressed={vote === 'yes'}
        >
          <ThumbsUp size={16} />
          {t('yes')}
        </button>

        <button
          onClick={() => handleVote('no')}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[14px] font-semibold border transition-all active:scale-95 disabled:opacity-60 ${
            vote === 'no'
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : 'bg-tg-surface border-tg-border/40 text-tg-hint hover:text-tg-text'
          }`}
          aria-pressed={vote === 'no'}
        >
          <ThumbsDown size={16} />
          {t('no')}
        </button>
      </div>

      {/* ── Reasons (visible only after "No") ── */}
      {vote === 'no' && (
        <div className="border-t border-tg-border/20 px-4 pt-4 pb-4 animate-slide-up space-y-3">
          <p className="text-[13px] font-semibold text-tg-hint uppercase tracking-wide">
            {t('what_went_wrong')}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {REASONS.map(({ key, labelKey }) => {
              const active = selected.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleReason(key)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] text-[13px] font-medium border transition-all active:scale-95 ${
                    active
                      ? 'bg-tg-accent/15 border-tg-accent/30 text-tg-accent'
                      : 'bg-tg-surface border-tg-border/40 text-tg-hint'
                  }`}
                  aria-pressed={active}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors ${
                    active ? 'bg-tg-accent border-tg-accent' : 'border-tg-hint/50'
                  }`} />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSubmitReasons}
            disabled={submitting || selected.length === 0}
            className="w-full py-2.5 bg-tg-accent text-white rounded-[12px] text-[14px] font-semibold active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" />{t('submit')}</>
              : t('submit')}
          </button>
        </div>
      )}
    </div>
  );
}
