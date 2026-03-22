import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl animate-fade-in flex justify-center" 
      onClick={onClose}
    >
      <div 
        className="h-[100dvh] w-full max-w-[480px] flex flex-col relative bg-black shadow-2xl" 
        onClick={(e) => e.stopPropagation()} 
        onTouchStart={onTS} 
        onTouchEnd={onTE}
      >
        {/* ── Header Flotante (Siempre Visible) ── */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,1rem)] pb-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <span className="text-[13px] font-bold text-white/90 bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md pointer-events-auto border border-white/10 shadow-sm tracking-wider">
            {idx + 1} / {items.length}
          </span>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90 pointer-events-auto shadow-sm"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Contenido Scrollable ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* ── Área de Imagen ── */}
          <div className="relative w-full min-h-[50dvh] max-h-[65dvh] flex items-center justify-center bg-black flex-shrink-0">
            {hasPrev && (
              <button 
                onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx - 1]); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 shadow-sm"
              >
                <ChevronLeft size={26} className="mr-0.5" />
              </button>
            )}
            {hasNext && (
              <button 
                onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx + 1]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 shadow-sm"
              >
                <ChevronRight size={26} className="ml-0.5" />
              </button>
            )}

            {imgSrc ? (
              <div className="w-full h-full relative flex items-center justify-center">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="text-white/50 animate-spin" />
                  </div>
                )}
                <img 
                  src={imgSrc} 
                  alt={item.data?.caption || 'Favorite Media'}
                  className={`w-full max-h-[65dvh] object-contain transition-opacity duration-500 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)} 
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a]">
                <span className="text-7xl drop-shadow-2xl opacity-60 mb-4">{item.context === 'animal' ? '🐾' : '⭐'}</span>
                <span className="text-white/30 text-[13px] font-medium tracking-wider uppercase">{t('no_preview', 'No Preview')}</span>
              </div>
            )}
          </div>

          {/* ── Panel de Información (Abajo de la imagen) ── */}
          <div className="px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-6 bg-gradient-to-b from-black via-[#0a0a0a] to-[#111] min-h-[40dvh]">
            
            {/* Caption */}
            {item.data?.caption && (
              <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap break-words font-medium">
                {item.data.caption}
              </p>
            )}

            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-semibold text-white/80 tracking-wide">
                <Tag size={14} className="text-white/40" /> {CONTEXT_KEYS[item.context] ? t(CONTEXT_KEYS[item.context]) : item.context}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-semibold text-white/80 tracking-wide">
                <Cpu size={14} className="text-white/40" /> {ENGINES[item.engine] || item.engine}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-semibold text-white/80 tracking-wide">
                <Calendar size={14} className="text-white/40" /> {date}
              </span>
              {full && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-semibold text-white/80 tracking-wide">
                  <Maximize2 size={14} className="text-white/40" /> {full.width}×{full.height}
                </span>
              )}
              {full?.file_size && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-semibold text-white/80 tracking-wide">
                  {formatFileSize(full.file_size)}
                </span>
              )}
            </div>

            {/* Acciones (Grid Responsivo) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {item.data?.caption && (
                <button 
                  onClick={handleCopy}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.08] border border-white/5 text-white text-[14px] font-bold hover:bg-white/[0.12] active:scale-[0.98] transition-all shadow-sm"
                >
                  <Copy size={18} className={copied ? "text-emerald-400" : "text-white/60"} /> 
                  {copied ? t('common:copied', 'Copied') : t('common:copy_text', 'Copy Text')}
                </button>
              )}
              
              <button 
                onClick={handleShare}
                className="col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.08] border border-white/5 text-white text-[14px] font-bold hover:bg-white/[0.12] active:scale-[0.98] transition-all shadow-sm"
              >
                <Share2 size={18} className="text-white/60" /> {t('common:share', 'Share')}
              </button>

              {item.engine_id && (
                <button 
                  onClick={() => { navigator.clipboard.writeText(item.engine_id); haptic?.notificationOccurred('success'); }}
                  className="col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.08] border border-white/5 text-white text-[14px] font-bold hover:bg-white/[0.12] active:scale-[0.98] transition-all shadow-sm"
                >
                  <ExternalLink size={18} className="text-white/60" /> {t('common:copy_id', 'Copy ID')}
                </button>
              )}
              
              <button 
                onClick={handleDelete}
                className={`col-span-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] text-[14px] font-bold active:scale-[0.98] transition-all shadow-sm ${
                  confirmDelete 
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                    : 'bg-white/[0.05] border border-white/5 text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Trash2 size={18} className={confirmDelete ? "text-red-500" : "text-red-400/80"} /> 
                {confirmDelete ? t('confirm_delete_tap', 'Tap to Confirm') : t('delete_favorite', 'Delete')}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}