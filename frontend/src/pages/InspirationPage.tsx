import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Pause, Play, RefreshCw, Sparkles } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-tg-bg flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-[13px] text-tg-hint font-medium">{t('loading', 'Loading...')}</span>
      </div>
    </motion.div>
  );

  if (items.length === 0) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[9999] bg-tg-bg flex flex-col items-center justify-center gap-4 text-center px-8"
    >
      <div className="w-16 h-16 rounded-[20px] bg-tg-secondary border border-tg-border/30 flex items-center justify-center">
        <Sparkles size={28} className="text-tg-hint/40" />
      </div>
      <p className="text-tg-text font-semibold text-[16px]">{t('no_inspiration')}</p>
      <p className="text-tg-hint text-[13px] max-w-[240px]">{t('no_inspiration_desc', 'Save some favorites first to get inspired.')}</p>
      <button onClick={() => navigate(-1)} className="mt-2 px-6 py-2.5 rounded-[14px] bg-tg-accent text-white text-[14px] font-semibold active:scale-95 transition-transform">
        {t('go_back')}
      </button>
    </motion.div>
  );

  const current = items[index];
  const full = getFullSize(current.data?.photo);
  const imgSrc = full ? fileUrl(full.file_id) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] bg-tg-bg select-none"
      onTouchStart={(e) => setTx(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (tx !== null) { const d = e.changedTouches[0].clientX - tx; if (d > 80) goTo(-1); else if (d < -80) goTo(1); setTx(null); } }}
    >
      {/* Image */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {imgSrc ? (
          <img src={imgSrc} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-7xl opacity-40">{current.context === 'animal' ? '🐾' : '⭐'}</span>
        )}
      </div>

      {/* Caption */}
      <AnimatePresence>
        {current.data?.caption && fade && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-24 left-0 right-0 px-6 text-center"
          >
            <p className="text-tg-text text-[13px] font-medium leading-relaxed bg-tg-secondary/80 backdrop-blur-md rounded-[14px] px-4 py-3 inline-block max-w-[90%] border border-tg-border/20 shadow-sm">
              {current.data.caption.length > 120 ? current.data.caption.slice(0, 120) + '…' : current.data.caption}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav arrows */}
      <button onClick={() => goTo(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-tg-secondary/60 border border-tg-border/30 backdrop-blur-sm flex items-center justify-center text-tg-text active:scale-90 transition-transform">
        <ChevronLeft size={22} />
      </button>
      <button onClick={() => goTo(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-tg-secondary/60 border border-tg-border/30 backdrop-blur-sm flex items-center justify-center text-tg-text active:scale-90 transition-transform">
        <ChevronRight size={22} />
      </button>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-90 transition-transform shadow-sm">
          <X size={18} />
        </button>
        <span className="text-[12px] font-bold text-tg-text bg-tg-secondary/80 px-3 py-1 rounded-full border border-tg-border/20">
          {index + 1} / {items.length}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused((p) => !p)}
            className="w-9 h-9 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-90 transition-transform shadow-sm">
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={loadItems}
            className="w-9 h-9 rounded-full bg-tg-secondary/80 border border-tg-border/30 flex items-center justify-center text-tg-text active:scale-90 transition-transform shadow-sm">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-4 right-4 flex gap-1">
        {items.slice(0, Math.min(items.length, 20)).map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-tg-border/30">
            <div
              className={`h-full rounded-full transition-all duration-300 ${i === index % Math.min(items.length, 20) ? 'bg-tg-accent w-full' : i < index % Math.min(items.length, 20) ? 'bg-tg-text/30 w-full' : 'w-0'}`}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
