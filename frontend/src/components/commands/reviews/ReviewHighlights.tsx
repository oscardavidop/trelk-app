import { memo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchReviewHighlights } from '../../../services/commandStatsApi';
import { useTelegram } from '../../../hooks/useTelegram';

interface Props {
  command: string;
}

function ReviewHighlights({ command }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const { data } = useQuery({
    queryKey: ['review-highlights', command],
    queryFn: () => fetchReviewHighlights(command),
    staleTime: 10 * 60_000,
    enabled: !!command,
  });

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
  }, [data]);

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
    const walk = (x - startX.current) * 1.2;

    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const stopDragging = () => {
    isDragging.current = false;
  };

  // NUEVO: Recibimos el elemento HTML para poder hacerle scrollIntoView
  const toggleExpand = (index: number, element: HTMLElement) => {
    const isExpanding = expandedIndex !== index;
    setExpandedIndex(isExpanding ? index : null);
    haptic?.selectionChanged();

    // Si se está expandiendo, lo centramos en la vista
    if (isExpanding) {
      setTimeout(() => {
        // Usamos block 'nearest' para no afectar el scroll vertical de la página,
        // y inline 'center' para centrarlo perfectamente en el scroll horizontal.
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50); // Pequeño delay para que la animación de tamaño inicie antes de mover
    }
  };

  if (!data?.highlights?.length) {
    if (data !== undefined) {
      return null;
    }
    return null;
  }

  return (
    <section className="mt-4 space-y-2">
      <style>{`
        .hide-native-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <h4 className="text-[13px] font-semibold text-tg-hint px-5">
        {t('reviews_highlights')}
      </h4>

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
              className="absolute left-0 top-1 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-tg-bg/90 backdrop-blur-md border border-tg-border/50 shadow-md text-tg-text hover:bg-tg-secondary ml-2"
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
          className={`flex gap-2 overflow-x-auto px-5 pb-3 pt-1 hide-native-scrollbar relative z-10 items-start cursor-${isDragging.current ? 'grabbing' : 'grab'
            }`}
        >
          {data.highlights.map((text: string, i: number) => {
            const isExpanded = expandedIndex === i;

            return (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.60 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  layout: { duration: 0.3, type: "spring", bounce: 0.2 },
                  opacity: { duration: 0.2, delay: i * 0.05 }
                }}
                // NUEVO: Pasamos e.currentTarget a la función para tener la referencia del nodo
                onClick={(e) => toggleExpand(i, e.currentTarget)}
                className={`
                  shrink-0 flex items-center gap-1.5 bg-tg-secondary/80 border border-tg-border/30 
                  cursor-pointer hover:bg-tg-secondary transition-colors
                  ${isExpanded ? 'rounded-[16px] px-3.5 py-2.5 max-w-[300px]' : 'rounded-full px-3 py-1.5 max-w-[200px]'}
                `}
              >
                <motion.div 
                 className="shrink-0 self-start mt-[2px]">
                  <MessageCircle size={12} className="text-tg-accent" />
                </motion.div>
                <motion.span
                  key={isExpanded ? 'expanded' : 'collapsed'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[12px] text-tg-text/80 ${isExpanded ? 'whitespace-normal leading-snug' : 'truncate'
                    }`}>
                  {text}
                </motion.span>
              </motion.div>
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
              className="absolute right-0 top-1 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-tg-bg/90 backdrop-blur-md border border-tg-border/50 shadow-md text-tg-text hover:bg-tg-secondary mr-2"
            >
              <ChevronRight size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default memo(ReviewHighlights);