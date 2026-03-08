import React, { memo, useState, useCallback, useRef } from 'react';
import { Cat, Check } from 'lucide-react';
import { fileUrl, getThumbnail, getFullSize, formatFileSize, type FavoriteItem, type ViewMode } from '../services/favoritesApi';

const EMOJI: Record<string, string | React.ReactNode> = { playlist: '🎵', track: '🎶', album: '💿', artist: '🎤', animal: <Cat className="h-3 w-3" /> };
const ENGINES: Record<string, string> = { sp: 'Spotify', youtube: 'YouTube', local: 'Local', telegram: 'Telegram', dog: 'Dog', cat: 'Cat' };

interface Props {
  item: FavoriteItem;
  index: number;
  selectMode: boolean;
  selected: boolean;
  viewMode: ViewMode;
  onSelect: (id: string) => void;
  onClick: (item: FavoriteItem) => void;
}

function CardInner({ item, index, selectMode, selected, viewMode, onSelect, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const thumb = getThumbnail(item.data?.photo);
  const full = getFullSize(item.data?.photo);
  const imgSrc = thumb ? fileUrl(thumb.file_id) : null;
  const emoji = EMOJI[item.context] || '⭐';
  const engine = ENGINES[item.engine] || item.engine;

  const handleClick = useCallback(() => {
    if (selectMode) onSelect(item._id);
    else onClick(item);
  }, [selectMode, item, onSelect, onClick]);

  const onTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => { if (!selectMode) onSelect(item._id); }, 500);
  }, [selectMode, item._id, onSelect]);

  const onTouchEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const date = new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  // ── LIST MODE ──
  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 cursor-pointer select-none ${selected ? 'bg-tg-accent/10' : 'active:bg-white/[0.04]'
          }`}
        style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* Checkbox nativo a la izquierda en modo lista */}
        {selectMode && (
          <div className="flex-shrink-0 transition-all duration-300 ease-out">
            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] transition-colors ${selected ? 'bg-tg-accent border-tg-accent' : 'border-tg-hint/40 bg-black/10'
              }`}>
              {selected && <Check size={14} strokeWidth={3.5} className="text-white" />}
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/[0.04] border border-white/5 flex-shrink-0">
          {imgSrc && !error ? (
            <img
              src={imgSrc}
              alt=""
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${selected ? 'scale-95 rounded-xl' : 'active:scale-95'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">
              {
                typeof emoji === 'string' ? (
                  <span>{emoji}</span>
                ) : (
                  emoji
                )
              }
            </div>
          )}
        </div>

        {/* Información */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-tg-text font-medium truncate tracking-tight">
            {item.data?.caption?.split('\n')[0] || `${emoji} ${engine}`}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[13px] text-tg-hint">{item.context}</span>
            <span className="text-[10px] text-tg-hint/40">•</span>
            <span className="text-[13px] text-tg-hint">{engine}</span>
            <span className="text-[10px] text-tg-hint/40">•</span>
            <span className="text-[13px] text-tg-hint">{date}</span>
          </div>
          {full && (
            <p className="text-[11px] text-tg-hint/60 mt-0.5 font-medium">
              {full.width}×{full.height} · {formatFileSize(full.file_size)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── COMPACT MODE ──
  if (viewMode === 'compact') {
    return (
      <div
        className="relative aspect-square overflow-hidden cursor-pointer select-none"
        onContextMenu={(e) => { e.preventDefault(); onSelect(item._id); }} // Mantener pulsado para seleccionar
        style={{ animationDelay: `${Math.min(index * 15, 150)}ms` }}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className={`absolute inset-0 w-full h-full transition-transform duration-200 ${selected ? 'scale-[0.92] rounded-lg' : 'active:scale-[0.96]'}`}>
          {imgSrc && !error ? (
            <>
              {!loaded && <div className="absolute inset-0 bg-white/[0.04] animate-pulse" />}
              <img
                src={imgSrc}
                alt=""
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${selected ? 'scale-95 rounded-xl' : 'active:scale-95'}`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-white/[0.03] flex items-center justify-center text-2xl opacity-30">{emoji}</div>
          )}

          {selected && (
            <div className="absolute inset-0 bg-tg-accent/20 ring-2 ring-inset ring-tg-accent pointer-events-none rounded-lg" />
          )}
        </div>

        {(selectMode || selected) && (
          <div className="absolute top-1 right-1 z-10 pointer-events-none">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${selected ? 'bg-tg-accent scale-100' : 'bg-black/40 backdrop-blur-sm border-[1.5px] border-white/60 scale-90'
              }`}>
              {selected && <Check size={10} strokeWidth={4} className="text-white" />}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GALLERY MODE (default) ──
  return (
    <div
      className="relative aspect-square overflow-hidden cursor-pointer select-none"
      onContextMenu={(e) => { e.preventDefault(); onSelect(item._id); }} // Mantener pulsado para seleccionar
      style={{ animationDelay: `${Math.min(index * 15, 150)}ms` }}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className={`absolute inset-0 w-full h-full transition-all duration-300 ease-out origin-center ${selected ? 'scale-[0.88] rounded-2xl shadow-lg ring-2 ring-tg-accent' : ''
        }`}>
        {imgSrc && !error ? (
          <>
            {!loaded && <div className="absolute inset-0 bg-white/[0.04] animate-pulse" />}
            <img
              src={imgSrc}
              alt=""
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${selected ? 'scale-95 rounded-xl' : 'active:scale-95'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
            <span className="text-3xl opacity-40 drop-shadow-md">{emoji}</span>
          </div>
        )}

        {/* Badge Contexto/Engine */}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-1 rounded-[8px] bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[11px] leading-none">{emoji}</span>
          <span className="text-[10px] font-semibold text-white/95 tracking-wide">{engine}</span>
        </div>

        {/* Overlay oscuro al seleccionar */}
        {selected && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-2xl" />
        )}
      </div>

      {/* Checkbox (fijo en la esquina, no se encoge con la imagen) */}
      {(selectMode || selected) && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-200 ${selected
              ? 'bg-tg-accent border-2 border-tg-accent scale-100'
              : 'bg-black/30 backdrop-blur-sm border-[1.5px] border-white/60 scale-95 opacity-80'
            }`}>
            {selected && <Check size={14} strokeWidth={3.5} className="text-white" />}
          </div>
        </div>
      )}
    </div>
  );
}

export const FavoriteCard = memo(CardInner);
export default FavoriteCard;