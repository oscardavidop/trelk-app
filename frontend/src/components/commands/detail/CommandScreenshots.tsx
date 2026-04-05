import { memo, useState, useCallback, useRef, TouchEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const MOCK_SCREENSHOTS = [
  'https://i.ibb.co/j9gf9LyK/Messages-Status-1.png',
  'https://i.ibb.co/XZ6W1wbt/Messages-Status.png',
];

interface Props {
  photos?: string[];
  cmdName: string;
}

const card = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1 },
};

function CommandScreenshots({ photos, cmdName }: Props) {
  const { t } = useTranslation('commandDetail');
  const hasReal = photos && photos.length > 0;
  const images = hasReal ? photos : MOCK_SCREENSHOTS;

  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /* 🆕 mouse drag */
  const isDragging = useRef(false);
  const hasDragged = useRef(false); // <-- NUEVO: Detecta si hubo movimiento real
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const openGallery = useCallback((i: number) => {
    // Si hubo un arrastre real, ignoramos el click
    if (hasDragged.current) return;
    setGalleryIdx(i)
  }, []);
  
  const closeGallery = useCallback(() => setGalleryIdx(null), []);

  const goPrev = useCallback(() => {
    setGalleryIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const goNext = useCallback(() => {
    setGalleryIdx((prev) =>
      prev !== null && prev < images.length - 1 ? prev + 1 : prev
    );
  }, [images.length]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? goNext() : goPrev();
      }
    },
    [goNext, goPrev]
  );

  /* 🆕 scroll detect */
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];

    let closest = 0;
    let minDiff = Infinity;

    children.forEach((child, i) => {
      const rect = child.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const diff = Math.abs(window.innerWidth / 2 - center);

      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });

    setActiveIdx(closest);
  }, []);

  /* 🆕 mouse handlers */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    isDragging.current = true;
    hasDragged.current = false; // Reiniciamos el estado de arrastre
    startX.current = e.pageX - container.offsetLeft;
    scrollLeft.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDragging.current) return;
    const container = containerRef.current;
    if (!container) return;

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    
    // Si el mouse se mueve más de 5px, lo consideramos un arrastre (no un click)
    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }

    container.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    // No reiniciamos hasDragged.current aquí porque el evento onClick ocurre DESPUÉS de onMouseUp
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    if (galleryIdx !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [galleryIdx]);

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-3">
        {t('preview')}
      </h2>

      <motion.div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e)=> {e.preventDefault();}}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {hasReal
          ? photos.map((url, i) => (
              <motion.img
                key={i}
                variants={card}
                src={`https://cdn.trelkbot.com/assets/img/commands/${cmdName}/${url}`}
                alt={`Screenshot ${i + 1}`}
                className="flex-shrink-0 w-[235px] h-[500px] rounded-[20px] cursor-pointer"
                loading="lazy"
                onClick={() => openGallery(i)}
              />
            ))
          : MOCK_SCREENSHOTS.map((src, i) => (
              <motion.div
                key={i}
                variants={card}
                className="flex-shrink-0 w-[235px] h-[500px] rounded-[20px] cursor-pointer"
                onClick={() => openGallery(i)}
              >
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </motion.div>
            ))}
      </motion.div>

      {/* DOTS NORMAL */}
      <div className="flex justify-center mt-2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = containerRef.current?.children[i] as HTMLElement;
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={`transition-all duration-300 rounded-full ${
              i === activeIdx
                ? 'w-5 h-2 bg-tg-text'
                : 'w-2 h-2 bg-tg-hint/40'
            }`}
          />
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
          {galleryIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
              onClick={closeGallery}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <button
                onClick={closeGallery}
                className="absolute top-10 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X size={20} className="text-white" />
              </button>

              <span className="absolute top-10 left-1/2 -translate-x-1/2 text-white/60 text-[13px] font-medium">
                {galleryIdx + 1} / {images.length}
              </span>

              {galleryIdx > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <ChevronLeft size={22} className="text-white" />
                </button>
              )}

              {galleryIdx < images.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <ChevronRight size={22} className="text-white" />
                </button>
              )}

              <AnimatePresence mode="wait">
                <motion.img
                  key={galleryIdx}
                  src={
                    hasReal
                      ? `https://cdn.trelkbot.com/assets/img/commands/${cmdName}/${images[galleryIdx]}`
                      : images[galleryIdx]
                  }
                  alt={`Screenshot ${galleryIdx + 1}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="max-w-[800px] max-h-[700px] rounded-xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </AnimatePresence>

              {/* DOTS FULLSCREEN */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIdx(i);
                    }}
                    className={`transition-all duration-300 rounded-full ${
                      i === galleryIdx
                        ? 'w-5 h-2 bg-white'
                        : 'w-2 h-2 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}

export default memo(CommandScreenshots);