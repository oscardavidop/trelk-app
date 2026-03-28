import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, Type } from 'lucide-react';
import { fetchCommandPreview } from '../../../services/commandStatsApi';

interface Props {
  slug: string;
  supportsPreview: boolean;
}

function CommandLivePreview({ slug, supportsPreview }: Props) {
  const { t } = useTranslation('commandDetail');
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!input.trim()) { setDebouncedInput(''); return; }
    timerRef.current = setTimeout(() => setDebouncedInput(input.trim()), 400);
    return () => clearTimeout(timerRef.current);
  }, [input]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['command-preview', slug, debouncedInput],
    queryFn: () => fetchCommandPreview(slug, debouncedInput),
    enabled: !!debouncedInput && supportsPreview,
    staleTime: 30_000,
    retry: 1,
  });

  if (!supportsPreview) return null;

  return (
    <section className="px-5 mt-6">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <Zap size={15} className="text-yellow-500" />
        {t('live_preview', 'Live Preview')}
      </h2>

      <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 overflow-hidden shadow-sm">
        {/* Input */}
        <div className="p-4 border-b border-tg-border/20">
          <div className="flex items-center gap-2 bg-tg-bg/60 rounded-[14px] border border-tg-border/30 px-3 py-2.5">
            <Type size={14} className="text-tg-hint/60 flex-shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('preview_placeholder', 'Type to preview...')}
              className="flex-1 bg-transparent text-[14px] text-tg-text outline-none placeholder:text-tg-hint/40"
              maxLength={200}
            />
          </div>
        </div>

        {/* Result area */}
        <AnimatePresence mode="wait">
          {isLoading && debouncedInput && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded-[6px] bg-tg-hint/10 animate-pulse" />
                <div className="h-4 w-1/2 rounded-[6px] bg-tg-hint/10 animate-pulse" />
              </div>
            </motion.div>
          )}

          {!isLoading && data?.result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              <div className="text-[14px] text-tg-text/90 whitespace-pre-wrap leading-relaxed bg-tg-accent/5 rounded-[12px] p-3 border border-tg-accent/10">
                {data.result}
              </div>
              {data.cached && (
                <p className="text-[10px] text-tg-hint/50 mt-1.5 pl-1">{t('preview_cached', 'Cached result')}</p>
              )}
            </motion.div>
          )}

          {!isLoading && data && !data.result && debouncedInput && (
            <motion.div
              key="no-result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 text-center"
            >
              <p className="text-[12px] text-tg-hint/60">{t('preview_unavailable', 'Preview not available for this input')}</p>
            </motion.div>
          )}

          {isError && debouncedInput && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 flex items-center gap-2 text-red-400"
            >
              <AlertCircle size={14} />
              <span className="text-[12px]">{t('preview_error', 'Could not load preview')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!debouncedInput && !isLoading && (
          <div className="p-4 text-center">
            <p className="text-[12px] text-tg-hint/50">{t('preview_hint', 'Type an input to see a preview')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(CommandLivePreview);
