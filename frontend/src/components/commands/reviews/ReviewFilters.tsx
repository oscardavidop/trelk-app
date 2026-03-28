import { memo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';

export type ReviewFilterType = 'all' | 'positive' | 'negative' | 1 | 2 | 3 | 4 | 5;
export type ReviewSortType = 'relevant' | 'recent';

interface Props {
  activeFilter: ReviewFilterType;
  activeSort: ReviewSortType;
  onFilterChange: (f: ReviewFilterType) => void;
  onSortChange: (s: ReviewSortType) => void;
}

function ReviewFilters({ activeFilter, activeSort, onFilterChange, onSortChange }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const filters: { key: ReviewFilterType; label: string }[] = [
    { key: 'all', label: t('reviews_filter_all') },
    { key: 'positive', label: t('reviews_filter_positive') },
    { key: 'negative', label: t('reviews_filter_negative') },
    { key: 5, label: '5' },
    { key: 4, label: '4' },
    { key: 3, label: '3' },
    { key: 2, label: '2' },
    { key: 1, label: '1' },
  ];

  const handleFilter = (f: ReviewFilterType) => {
    haptic?.impactOccurred('light');
    onFilterChange(f);
  };

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });

    haptic?.impactOccurred('light');
  };

  // =========================
  // DRAG SCROLL (PC)
  // =========================
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;

    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;

    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2; // velocidad

    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const stopDragging = () => {
    isDragging.current = false;
  };

  return (
    <div className="space-y-4">
      <style>{`
        .hide-native-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <div
        className="relative px-1"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          stopDragging();
        }}
      >
        {/* Flecha izquierda */}
        <AnimatePresence>
          {isHovering && canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-tg-bg/90 backdrop-blur-md border border-tg-border/50 shadow-md text-tg-text hover:bg-tg-secondary"
            >
              <ChevronLeft size={18} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className={`flex gap-2 overflow-x-auto px-4 py-1 hide-native-scrollbar relative z-10 cursor-${
            isDragging.current ? 'grabbing' : 'grab'
          }`}
        >
          {filters.map(({ key, label }) => {
            const active = activeFilter === key;
            const isStar = typeof key === 'number';

            return (
              <motion.button
                key={String(key)}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleFilter(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[7px] rounded-full text-[12.5px] font-semibold border transition-all ${
                  active
                    ? 'bg-tg-accent text-white border-tg-accent shadow-sm shadow-tg-accent/20'
                    : 'bg-tg-secondary/80 text-tg-hint border-tg-border/40 hover:border-tg-accent/30 hover:text-tg-text'
                }`}
              >
                {isStar && (
                  <Star
                    size={12}
                    className={active ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}
                  />
                )}
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* Flecha derecha */}
        <AnimatePresence>
          {isHovering && canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-tg-bg/90 backdrop-blur-md border border-tg-border/50 shadow-md text-tg-text hover:bg-tg-secondary"
            >
              <ChevronRight size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-between px-5">
        <span className="text-[13px] font-semibold text-tg-text">
          {t('reviews_filter_all')}
        </span>

        <div className="flex gap-1 bg-tg-secondary/60 rounded-full p-0.5 border border-tg-border/30">
          {(['relevant', 'recent'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                haptic?.impactOccurred('light');
                onSortChange(s);
              }}
              className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                activeSort === s
                  ? 'bg-tg-bg text-tg-text shadow-sm'
                  : 'text-tg-hint hover:text-tg-text'
              }`}
            >
              {t(`reviews_sort_${s}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(ReviewFilters);