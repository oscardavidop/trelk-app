import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Copy, ChevronLeft, ChevronRight, Calendar, Cpu, Tag, Maximize2, Share2, ExternalLink } from 'lucide-react';
import { fileUrl, getFullSize, formatFileSize, type FavoriteItem } from '../services/favoritesApi';
import { useTelegram } from '../hooks/useTelegram';

const ENGINES: Record<string, string> = { sp: 'Spotify', youtube: 'YouTube', local: 'Local', telegram: 'Telegram', dog: 'Dog', cat: 'Cat' };
const CONTEXTS: Record<string, string> = { playlist: 'Playlist', track: 'Track', album: 'Album', artist: 'Artista', animal: 'Animal' };

interface Props {
  item: FavoriteItem;
  items: FavoriteItem[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onNavigate: (item: FavoriteItem) => void;
}

export default function FavoriteModal({ item, items, onClose, onDelete, onNavigate }: Props) {
  const { haptic } = useTelegram();
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
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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

  const date = new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black" 
      onClick={onClose}
    >
      <div 
        className="h-[100dvh] w-full max-w-[600px] mx-auto flex flex-col relative" 
        onClick={(e) => e.stopPropagation()} 
        onTouchStart={onTS} 
        onTouchEnd={onTE}
      >
        {/* ── Header Flotante (Siempre Visible) ── */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <span className="text-[13px] font-bold tracking-widest text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md pointer-events-auto">
            {idx + 1} / {items.length}
          </span>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 pointer-events-auto"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Contenido Scrollable ── */}
        {/* Usamos scrollbar-hide en Tailwind nativo */}
        <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* ── Área de Imagen ── */}
          <div className="relative w-full min-h-[50dvh] max-h-[65dvh] flex items-center justify-center bg-black flex-shrink-0">
            {hasPrev && (
              <button 
                onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx - 1]); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <ChevronLeft size={28} />
              </button>
            )}
            {hasNext && (
              <button 
                onClick={() => { haptic?.impactOccurred('light'); onNavigate(items[idx + 1]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
              >
                <ChevronRight size={28} />
              </button>
            )}

            {imgSrc ? (
              <div className="w-full h-full relative flex items-center justify-center">
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <img 
                  src={imgSrc} 
                  alt={item.data?.caption || ''}
                  className={`w-full max-h-[65dvh] object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)} 
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#111]">
                <span className="text-7xl drop-shadow-2xl opacity-80">{item.context === 'animal' ? '🐾' : '⭐'}</span>
              </div>
            )}
          </div>

          {/* ── Panel de Información (Abajo de la imagen) ── */}
          <div className="px-5 pt-6 pb-12 space-y-6 bg-gradient-to-b from-black to-[#111] min-h-[40dvh]">
            
            {/* Caption */}
            {item.data?.caption && (
              <p className="text-[15px] text-white/95 leading-relaxed whitespace-pre-wrap break-words font-medium">
                {item.data.caption}
              </p>
            )}

            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-medium text-white/80">
                <Tag size={13} className="text-white/50" /> {CONTEXTS[item.context] || item.context}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-medium text-white/80">
                <Cpu size={13} className="text-white/50" /> {ENGINES[item.engine] || item.engine}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-medium text-white/80">
                <Calendar size={13} className="text-white/50" /> {date}
              </span>
              {full && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-medium text-white/80">
                  <Maximize2 size={13} className="text-white/50" /> {full.width}×{full.height}
                </span>
              )}
              {full?.file_size && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/5 text-[12px] font-medium text-white/80">
                  {formatFileSize(full.file_size)}
                </span>
              )}
            </div>

            {/* Acciones (Grid Responsivo) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {item.data?.caption && (
                <button 
                  onClick={handleCopy}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.1] text-white text-[14px] font-bold hover:bg-white/[0.15] active:scale-[0.98] transition-all"
                >
                  <Copy size={18} className={copied ? "text-emerald-400" : "text-white/70"} /> 
                  {copied ? '¡Copiado!' : 'Copiar Texto'}
                </button>
              )}
              
              <button 
                onClick={handleShare}
                className="col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.1] text-white text-[14px] font-bold hover:bg-white/[0.15] active:scale-[0.98] transition-all"
              >
                <Share2 size={18} className="text-white/70" /> Compartir
              </button>

              {item.engine_id && (
                <button 
                  onClick={() => { navigator.clipboard.writeText(item.engine_id); haptic?.notificationOccurred('success'); }}
                  className="col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-white/[0.1] text-white text-[14px] font-bold hover:bg-white/[0.15] active:scale-[0.98] transition-all"
                >
                  <ExternalLink size={18} className="text-white/70" /> Copiar ID
                </button>
              )}
              
              <button 
                onClick={handleDelete}
                className={`col-span-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] text-[14px] font-bold active:scale-[0.98] transition-all ${
                  confirmDelete 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                    : 'bg-white/[0.05] text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Trash2 size={18} /> {confirmDelete ? 'Toca de nuevo para confirmar' : 'Eliminar Favorito'}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}