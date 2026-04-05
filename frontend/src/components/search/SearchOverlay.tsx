import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchCommands, fetchTrending, fetchRecentSearches, SearchResult } from '../../services/searchApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
  const { t } = useTranslation('search');
  const { userId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Trending & recent
  const { data: trendingData } = useQuery({
    queryKey: ['search-trending'],
    queryFn: fetchTrending,
    staleTime: 60_000,
    enabled: isOpen,
  });

  const { data: recentData } = useQuery({
    queryKey: ['search-recent'],
    queryFn: fetchRecentSearches,
    staleTime: 30_000,
    enabled: isOpen,
  });

  // Search results (debounced)
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchCommands(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10_000,
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  const handleSelect = useCallback((command: string) => {
    onClose();
    navigate(`/users/ui/${userId}/bot-commands/${command}`);
  }, [navigate, userId, onClose]);

  const handleQuickSearch = useCallback((term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
  }, []);

  const trending = trendingData?.trending || [];
  const recent = recentData?.recent || [];
  const results = searchData?.results || [];
  const intent = searchData?.intent;
  const showResults = debouncedQuery.length >= 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-tg-bg"
          style={{
            paddingTop: 'var(--tg-top-offset, var(--tg-top2-offset, 0px))'
          }}
        >
          {/* Search bar */}
          <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-text/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-tg-text/[0.04] rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-tg-hint shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('placeholder')}
                  className="flex-1 bg-transparent text-sm text-tg-text placeholder:text-tg-hint outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setDebouncedQuery(''); }} className="text-tg-hint">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={onClose} className="text-sm text-tg-accent font-medium">
                {t('cancel')}
              </button>
            </div>

            {/* Intent badge */}
            {intent && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-1.5 text-xs text-tg-accent"
              >
                <Sparkles className="w-3 h-3" />
                {intent.type === 'category' && t('intent_category', { category: intent.value })}
                {intent.type === 'help' && t('intent_help', { command: intent.value })}
              </motion.div>
            )}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-60px)] px-4 py-3">
            {/* Results */}
            {showResults && (
              <div className="space-y-1">
                {isFetching && results.length === 0 ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-tg-text/[0.03] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  results.map((r, i) => (
                    <SearchResultItem key={r.command} result={r} index={i} onSelect={handleSelect} />
                  ))
                ) : (
                  <div className="text-center py-12 text-tg-hint text-sm">
                    {t('no_results')}
                  </div>
                )}
              </div>
            )}

            {/* Trending & Recent (when no query) */}
            {!showResults && (
              <div className="space-y-6">
                {recent.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {t('recent')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleQuickSearch(term)}
                          className="px-3 py-1.5 text-xs rounded-full bg-tg-text/[0.04] text-tg-text hover:bg-tg-accent/10 hover:text-tg-accent transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {trending.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> {t('trending')}
                    </h3>
                    <div className="space-y-1">
                      {trending.map((cmd, i) => (
                        <button
                          key={cmd}
                          onClick={() => handleSelect(cmd)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-tg-text/[0.04] transition-colors"
                        >
                          <span className="text-xs font-bold text-tg-accent/60 w-5 text-center">{i + 1}</span>
                          <span className="text-sm text-tg-text capitalize">{cmd.replace(/_/g, ' ')}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-tg-hint ml-auto" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SearchResultItem({ result, index, onSelect }: { result: SearchResult; index: number; onSelect: (cmd: string) => void }) {
  const matchColors: Record<string, string> = {
    exact: 'text-green-500',
    prefix: 'text-tg-accent',
    contains: 'text-tg-hint',
    alias: 'text-purple-500',
    fuzzy: 'text-tg-hint',
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(result.command)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-tg-text/[0.04] active:bg-tg-accent/5 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-tg-accent/10 flex items-center justify-center shrink-0">
        <span className="text-tg-accent text-sm font-bold">
          {result.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-tg-text truncate capitalize">
          {result.name.replace(/_/g, ' ')}
        </p>
        {result.description && (
          <p className="text-xs text-tg-hint truncate mt-0.5">{result.description}</p>
        )}
      </div>
      <span className={`text-[10px] font-medium ${matchColors[result.matchType] || 'text-tg-hint'}`}>
        {result.matchType}
      </span>
    </motion.button>
  );
}
