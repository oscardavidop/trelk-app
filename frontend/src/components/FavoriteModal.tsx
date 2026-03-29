import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Copy, ChevronLeft, ChevronRight, Calendar, Cpu, Tag, Maximize2, Share2, ExternalLink, Loader2 } from 'lucide-react';
import { fileUrl, getFullSize, formatFileSize, type FavoriteItem } from '../services/favoritesApi';
import { useTelegram } from '../hooks/useTelegram';

const ENGINES: Record<string, string> = { sp: 'Spotify', youtube: 'YouTube', local: 'Local', telegram: 'Telegram', dog: 'Dog', cat: 'Cat' };
const CONTEXT_KEYS: Record<string, string> = { playlist: 'playlist', track: 'track', album: 'album', artist: 'artist', animal: 'animal' };

interface Props {
  item: FavoriteItem;
  items: FavoriteItem[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onNavigate: (item: FavoriteItem) => void;
}

export default function FavoriteModal({ item, items, onClose, onDelete, onNavigate }: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('favorites');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const idx = items.findIndex((i) => i._id === item._id);
  const hasPrev = idx > 0;
  const hasNext = idx < items.length - 1;

  const full = getFullSize(item.data?.photo);
  const imgSrc = full ? fileUrl(full.file_id) : null;

  useEffect(() => { setImgLoaded(false); setConfirmDelete(false); setCopied(false); }, [item._id]);

  // Block body scroll
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(items[idx - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(items[idx + 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onNavigate, hasPrev, hasNext, items, idx]);

  // Swipe navigation
  const [touchX, setTouchX] = useState<number | null>(null);
  const onTS = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX);
  const onTE = (e: React.TouchEvent) => {
    if (touchX === null) return;
    const d = e.changedTouches[0].clientX - touchX;
    if (d > 80 && hasPrev) { haptic?.impactOccurred('light'); onNavigate(items[idx - 1]); }
    else if (d < -80 && hasNext) { haptic?.impactOccurred('light'); onNavigate(items[idx + 1]); }
    setTouchX(null);
  };

  const handleCopy = useCallback(() => {
    if (item.data?.caption) {
      navigator.clipboard.writeText(item.data.caption);
      haptic?.notificationOccurred('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [item.data?.caption, haptic]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); haptic?.impactOccurred('medium'); return; }
    haptic?.notificationOccurred('warning');
    onDelete(item._id);
    if (hasNext) onNavigate(items[idx + 1]);
    else if (hasPrev) onNavigate(items[idx - 1]);
    else onClose();
  }, [confirmDelete, item._id, onDelete, hasNext, hasPrev, items, idx, onNavigate, onClose, haptic]);

  const handleShare = useCallback(() => {
    const text = item.data?.caption || `${item.context} — ${item.engine}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [item]);

  const date = new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] bg-tg-bg flex justify-center"
        onClick={onClose}
      >
        <div
          className="h-[100dvh] w-full max-w-[480px] flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTS}
          onTouchEnd={onTE}
        >
          {/* ── Top Bar (Close + Counter) ── */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3 bg-gradient-to-b from-tg-bg via-tg-bg/80 to-transparent pointer-events-none">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-tg-secondary border border-tg-border/30 flex items-center justify-center text-tg-text transition-all active:scale-90 pointer-events-auto shadow-sm"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <span className="text-[13px] font-bold text-tg-text bg-tg-secondary/80 px-3 py-1.5 rounded-full pointer-events-auto border border-tg-border/20 shadow-sm">
              {idx + 1} / {items.length}
            </span>
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* ── Sticky Image Area ── */}
            <div className="sticky top-0 z-10 w-full min-h-[50dvh] max-h-[60dvh] flex items-center justify-center bg-tg-bg flex-shrink-0 relative">
              {hasPrev && (
                <button
                  onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx - 1]); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-90 transition-all shadow-sm"
                >
                  <ChevronLeft size={22} />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx + 1]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-90 transition-all shadow-sm"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              {imgSrc ? (
                <div className="w-full h-full relative flex items-center justify-center">
                  {!imgLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={28} className="text-tg-hint animate-spin" />
                    </div>
                  )}
                  <img
                    src={imgSrc}
                    alt={item.data?.caption || 'Favorite'}
                    className={`w-full max-h-[60dvh] object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImgLoaded(true)}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-6xl opacity-40 mb-3">{item.context === 'animal' ? '🐾' : '⭐'}</span>
                  <span className="text-tg-hint text-[12px] font-medium uppercase tracking-wider">{t('no_preview', 'No Preview')}</span>
                </div>
              )}

              {/* Bottom gradient for scroll transition */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-tg-bg to-transparent pointer-events-none" />
            </div>

            {/* ── Info Panel ── */}
            <div className="px-5 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-5 bg-tg-bg relative z-20">

              {/* Caption */}
              {item.data?.caption && (
                <p className="text-[14px] text-tg-text leading-relaxed whitespace-pre-wrap break-words font-medium">
                  {item.data.caption}
                </p>
              )}

              {/* Metadata Chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tg-secondary border border-tg-border/30 text-[11px] font-semibold text-tg-text/80">
                  <Tag size={12} className="text-tg-hint" /> {CONTEXT_KEYS[item.context] ? t(CONTEXT_KEYS[item.context]) : item.context}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tg-secondary border border-tg-border/30 text-[11px] font-semibold text-tg-text/80">
                  <Cpu size={12} className="text-tg-hint" /> {ENGINES[item.engine] || item.engine}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tg-secondary border border-tg-border/30 text-[11px] font-semibold text-tg-text/80">
                  <Calendar size={12} className="text-tg-hint" /> {date}
                </span>
                {full && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tg-secondary border border-tg-border/30 text-[11px] font-semibold text-tg-text/80">
                    <Maximize2 size={12} className="text-tg-hint" /> {full.width}×{full.height}
                  </span>
                )}
                {full?.file_size && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tg-secondary border border-tg-border/30 text-[11px] font-semibold text-tg-text/80">
                    {formatFileSize(full.file_size)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                {item.data?.caption && (
                  <button
                    onClick={handleCopy}
                    className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] bg-tg-secondary border border-tg-border/30 text-tg-text text-[13px] font-semibold active:scale-[0.98] transition-all"
                  >
                    <Copy size={16} className={copied ? "text-emerald-500" : "text-tg-hint"} />
                    {copied ? t('common:copied', 'Copied') : t('common:copy_text', 'Copy Text')}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] bg-tg-secondary border border-tg-border/30 text-tg-text text-[13px] font-semibold active:scale-[0.98] transition-all"
                >
                  <Share2 size={16} className="text-tg-hint" /> {t('common:share', 'Share')}
                </button>

                {item.engine_id && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(item.engine_id); haptic?.notificationOccurred('success'); }}
                    className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] bg-tg-secondary border border-tg-border/30 text-tg-text text-[13px] font-semibold active:scale-[0.98] transition-all"
                  >
                    <ExternalLink size={16} className="text-tg-hint" /> {t('common:copy_id', 'Copy ID')}
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className={`col-span-2 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-[13px] font-semibold active:scale-[0.98] transition-all ${
                    confirmDelete
                      ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                      : 'bg-tg-secondary border border-tg-border/30 text-red-400'
                  }`}
                >
                  <Trash2 size={16} className={confirmDelete ? "text-red-500" : "text-red-400/80"} />
                  {confirmDelete ? t('confirm_delete_tap', 'Tap to Confirm') : t('delete_favorite', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}