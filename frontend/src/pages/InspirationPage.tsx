import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from 'lucide-react';
import { fetchRandom, fileUrl, getFullSize, type FavoriteItem } from '../services/favoritesApi';
import { useTelegram } from '../hooks/useTelegram';

const INTERVAL = 5000;

export default function InspirationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('favorites');
  const { haptic } = useTelegram();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRandom(30);
      if (res.ok && res.items.length > 0) { setItems(res.items); setIndex(0); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Auto advance
  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIndex((i) => (i + 1) % items.length); setFade(true); }, 200);
    }, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, items.length]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === 'ArrowLeft') goTo(-1);
      if (e.key === 'ArrowRight') goTo(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [items.length]);

  // Back button
  useEffect(() => {
    const back = window.Telegram?.WebApp?.BackButton;
    if (back) {
      back.show();
      const handler = () => navigate(-1);
      back.onClick(handler);
      return () => back.offClick(handler);
    }
  }, [navigate]);

  const goTo = useCallback((dir: number) => {
    if (items.length <= 1) return;
    setFade(false);
    haptic?.impactOccurred('light');
    setTimeout(() => {
      setIndex((i) => (i + dir + items.length) % items.length);
      setFade(true);
    }, 200);
  }, [items.length, haptic]);

  // Swipe
  const [tx, setTx] = useState<number | null>(null);

  if (loading) return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (items.length === 0) return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-4 text-center px-8">
      <span className="text-5xl">✨</span>
      <p className="text-white/80 text-[15px]">{t('no_inspiration')}</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 rounded-xl bg-tg-accent text-white text-[14px] font-medium active:scale-95 transition-transform">
        {t('go_back')}
      </button>
    </div>
  );

  const current = items[index];
  const full = getFullSize(current.data?.photo);
  const imgSrc = full ? fileUrl(full.file_id) : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black select-none"
      onTouchStart={(e) => setTx(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (tx !== null) { const d = e.changedTouches[0].clientX - tx; if (d > 80) goTo(-1); else if (d < -80) goTo(1); setTx(null); } }}
    >
      {/* Image */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {imgSrc ? (
          <img src={imgSrc} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-7xl">{current.context === 'animal' ? '🐾' : '⭐'}</span>
        )}
      </div>

      {/* Caption */}
      {current.data?.caption && fade && (
        <div className="absolute bottom-20 left-0 right-0 px-6 text-center">
          <p className="text-white/80 text-[14px] font-medium leading-relaxed bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 inline-block max-w-[90%]">
            {current.data.caption.length > 120 ? current.data.caption.slice(0, 120) + '…' : current.data.caption}
          </p>
        </div>
      )}

      {/* Nav arrows */}
      <button onClick={() => goTo(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <ChevronLeft size={24} />
      </button>
      <button onClick={() => goTo(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <ChevronRight size={24} />
      </button>

      {/* Top controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused((p) => !p)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95">
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button onClick={loadItems}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
        {items.slice(0, 15).map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === index % 15 ? 'bg-white w-4' : 'bg-white/30'}`} />
        ))}
      </div>
    </div>
  );
}
