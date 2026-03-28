import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Send, CheckCircle2, Loader2, ChevronUp, Lightbulb } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { createSuggestion, findSimilar, type SimilarSuggestion } from '@/services/suggestionsApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MIN_TITLE = 5;
const MIN_DESC = 15;

export default function CreateSuggestionModal({ open, onClose, onCreated }: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('suggestions');
  const navigate = useNavigate();
  const { userId } = useParams();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarSuggestion[]>([]);
  const [searchingSimlar, setSearchingSimilar] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [open]);

  // Search for similar suggestions as user types title
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length < 5) {
      setSimilar([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchingSimilar(true);
      try {
        const res = await findSimilar(title.trim());
        setSimilar(res.items || []);
      } catch {
        setSimilar([]);
      }
      setSearchingSimilar(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title]);

  const canSubmit = title.trim().length >= MIN_TITLE && description.trim().length >= MIN_DESC && !sending;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    haptic?.impactOccurred('medium');
    setSending(true);
    setError(null);

    try {
      await createSuggestion(title.trim(), description.trim());
      setSending(false);
      setSent(true);
      haptic?.notificationOccurred('success');

      setTimeout(() => {
        onCreated();
        setTimeout(() => {
          setSent(false);
          setTitle('');
          setDescription('');
          setSimilar([]);
          setError(null);
        }, 300);
      }, 1500);
    } catch (err: any) {
      setSending(false);
      const key = err?.error_key;
      if (key === 'create_limit') setError(t('error_rate_limit'));
      else if (key === 'title_too_short') setError(t('error_title_short'));
      else if (key === 'description_too_short') setError(t('error_desc_short'));
      else setError(err?.message || 'Error');
      haptic?.notificationOccurred('error');
    }
  }, [canSubmit, title, description, haptic, t, onCreated]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className="relative w-full sm:max-w-md max-h-[90vh] bg-tg-secondary rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl sm:animate-scale-in animate-slide-up border border-tg-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-tg-border/20 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lightbulb size={18} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-tg-text leading-tight">{t('create_title')}</h3>
                <p className="text-[13px] text-tg-hint mt-0.5">{t('create_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-full bg-tg-hint/10 flex items-center justify-center text-tg-hint hover:bg-tg-hint/20 active:scale-95 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sent ? (
            <div className="p-10 text-center animate-scale-in flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="w-[72px] h-[72px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 shadow-sm">
                <CheckCircle2 size={36} className="text-emerald-500" strokeWidth={2.5} />
              </div>
              <p className="text-[20px] font-bold text-tg-text mb-1">{t('success_title')}</p>
              <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[250px]">{t('success_desc')}</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="text-[13px] font-bold text-tg-text mb-2 block">{t('title_label')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('title_placeholder')}
                  maxLength={120}
                  className="w-full h-12 px-4 rounded-2xl bg-tg-bg border border-tg-border/40 text-[14px] text-tg-text placeholder:text-tg-hint/40 outline-none focus:border-tg-accent/40 transition-colors"
                />
                <div className="flex justify-between mt-1.5">
                  <span className={`text-[11px] font-medium ${title.trim().length >= MIN_TITLE ? 'text-tg-hint/40' : 'text-amber-500/70'}`}>
                    {title.trim().length < MIN_TITLE && title.trim().length > 0 ? t('error_title_short') : ''}
                  </span>
                  <span className="text-[11px] text-tg-hint/30">{title.length}/120</span>
                </div>
              </div>

              {/* Similar Suggestions */}
              {similar.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                  <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400 mb-2">{t('similar_found')}</p>
                  <p className="text-[11px] text-amber-500/70 mb-2.5">{t('similar_hint')}</p>
                  <div className="space-y-2">
                    {similar.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onClose();
                          navigate(`/users/ui/${userId}/labs/${s.id}`);
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-tg-bg/60 border border-tg-border/30 text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="flex flex-col items-center min-w-[36px]">
                          <ChevronUp size={14} className="text-tg-hint" />
                          <span className="text-[12px] font-bold text-tg-text">{s.votesCount}</span>
                        </div>
                        <span className="text-[13px] font-medium text-tg-text line-clamp-1">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-[13px] font-bold text-tg-text mb-2 block">{t('description_label')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('description_placeholder')}
                  maxLength={2000}
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl bg-tg-bg border border-tg-border/40 text-[14px] text-tg-text placeholder:text-tg-hint/40 outline-none focus:border-tg-accent/40 transition-colors resize-none"
                />
                <div className="flex justify-between mt-1.5">
                  <span className={`text-[11px] font-medium ${description.trim().length >= MIN_DESC ? 'text-tg-hint/40' : 'text-amber-500/70'}`}>
                    {description.trim().length < MIN_DESC && description.trim().length > 0 ? t('error_desc_short') : ''}
                  </span>
                  <span className="text-[11px] text-tg-hint/30">{description.length}/2000</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-[13px] text-red-500 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full py-3.5 rounded-[14px] text-[14px] font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  canSubmit
                    ? 'bg-tg-accent text-white shadow-sm shadow-tg-accent/20'
                    : 'bg-tg-text/[0.05] text-tg-hint/40 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} /> {t('submit')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
