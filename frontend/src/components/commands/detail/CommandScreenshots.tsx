import { memo, useState, useCallback, useRef, TouchEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const MOCK_SCREENSHOTS = [
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+1',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+2',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+3',
];

interface Props {
  photos?: string[];
}

const card = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1 },
};

function CommandScreenshots({ photos }: Props) {
  const { t } = useTranslation('commandDetail');
  const hasReal = photos && photos.length > 0;
  const images = hasReal ? photos : MOCK_SCREENSHOTS;

  /* ── Gallery state ── */
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const touchStartX = useRef(0);

  const openGallery = useCallback((i: number) => setGalleryIdx(i), []);
  const closeGallery = useCallback(() => setGalleryIdx(null), []);

  const goPrev = useCallback(() => {
    setGalleryIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const goNext = useCallback(() => {
    setGalleryIdx((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
  }, [goNext, goPrev]);

  useEffect(() => {
    if (galleryIdx !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [galleryIdx]);

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-3">
        {t('preview')}
      </h2>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {hasReal
          ? photos.map((url, i) => (
            <motion.img
              key={i}
              variants={card}
              src={`https://cdn.trelk.site/assets/img/commands/md5/1.jpg`}
              alt={`Screenshot ${i + 1}`}
              className="w-[180px] h-[320px] rounded-[20px] object-cover border border-tg-border/40 shadow-sm flex-shrink-0 cursor-pointer"
              loading="lazy"
              onClick={() => openGallery(i)}
            />
          ))
          : MOCK_SCREENSHOTS.map((src, i) => (
            <motion.div
              key={i}
              variants={card}
              className="flex-shrink-0 w-[180px] h-[320px] rounded-[20px] overflow-hidden bg-tg-hint/5 border border-tg-border/40 shadow-sm cursor-pointer"
              onClick={() => openGallery(i)}
            >
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-full h-full object-cover opacity-80"
                loading="lazy"
              />
            </motion.div>
          ))}
      </motion.div>

      {/* ── Fullscreen Gallery Overlay (Portal to escape transform ancestors) ── */}
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
              {/* Close button */}
              <button
                onClick={closeGallery}
                className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X size={20} className="text-white" />
              </button>

              {/* Counter */}
              <span className="absolute top-20 left-1/2 -translate-x-1/2 text-white/60 text-[13px] font-medium">
                {galleryIdx + 1} / {images.length}
              </span>

              {/* Navigation arrows (desktop) */}
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

              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={galleryIdx}
                  src={hasReal ? `https://cdn.trelk.site/assets/img/commands/md5/1.jpg` : images[galleryIdx]}
                  alt={`Screenshot ${galleryIdx + 1}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="max-w-[190vw] max-h-[190vh] rounded-xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}

export default memo(CommandScreenshots);
