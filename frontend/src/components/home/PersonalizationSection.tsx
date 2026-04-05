import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Compass, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchPersonalization, PersonalizedItem } from '../../services/personalizationApi';
import { useTelegram } from '../../hooks/useTelegram';
import { useRef, useState, useEffect } from 'react';

const SECTION_META = {
  forYou: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', titleKey: 'for_you', subtitleKey: 'for_you_subtitle' },
  continueUsing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', titleKey: 'continue_using', subtitleKey: 'continue_using_subtitle' },
  basedOnHistory: { icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', titleKey: 'based_on_history', subtitleKey: 'based_on_history_subtitle' },
  discover: { icon: Compass, color: 'text-emerald-400', bg: 'bg-emerald-500/10', titleKey: 'discover_new', subtitleKey: 'discover_new_subtitle' },
} as const;

function CommandPill({ item, onTap }: { item: PersonalizedItem; onTap: (cmd: string) => void }) {
  const { t } = useTranslation('personalization');

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => onTap(item.command)}
      className="flex-shrink-0 flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-2xl bg-tg-secondary border border-tg-border/20 active:bg-tg-accent/5 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-tg-accent/10 flex items-center justify-center">
        <span className="text-tg-accent text-sm font-bold">{item.name.charAt(0).toUpperCase()}</span>
      </div>

      <div className="text-left min-w-0">
        <div className="text-[13px] font-bold text-tg-text leading-tight truncate max-w-[120px]">
          /{item.command.replace(/_/g, ' ')}
        </div>
        <div className="text-[10px] text-tg-hint truncate max-w-[120px]">
          {t(item.reason, item.reason)}
        </div>
      </div>
    </motion.button>
  );
}

function Section({
  sectionKey,
  items,
  onTap,
}: {
  sectionKey: keyof typeof SECTION_META;
  items: PersonalizedItem[];
  onTap: (cmd: string) => void;
}) {
  const { t } = useTranslation('personalization');
  const { haptic } = useTelegram();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  if (!items.length) return null;

  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;

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
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });

    haptic?.impactOccurred('light');
  };

  // DRAG
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

  return (
    <div>
      <div className="flex items-center gap-2 px-6 mb-2.5">
        <Icon size={13} className={meta.color} />
        <h3 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider">
          {t(meta.titleKey)}
        </h3>
      </div>

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
          className={`flex gap-2.5 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden relative z-10 cursor-${
            isDragging.current ? 'grabbing' : 'grab'
          }`}
        >
          {items.slice(0, 8).map((item) => (
            <CommandPill key={item.command} item={item} onTap={onTap} />
          ))}
        </div>

        {/* Flecha derecha */}
        <AnimatePresence>
          {isHovering && canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-tg-bg/90 backdrop-blur-md opacity-100 border border-tg-border/50 shadow-md text-tg-text hover:bg-tg-secondary mr-2"
            >
              <ChevronRight size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PersonalizationSection() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const { data, isLoading } = useQuery({
    queryKey: ['personalization'],
    queryFn: fetchPersonalization,
    staleTime: 5 * 60_000,
  });

  const handleTap = (cmd: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${cmd.replace(/^\//, '')}`);
  };

  if (isLoading) {
    return (
      <div className="px-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-tg-text/[0.03] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const sections = [
    { key: 'continueUsing' as const, items: data.continueUsing },
    { key: 'basedOnHistory' as const, items: data.basedOnHistory },
    { key: 'discover' as const, items: data.discover },
  ];

  const hasContent = sections.some((s) => s.items.length > 0);
  if (!hasContent) return null;

  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <Section key={s.key} sectionKey={s.key} items={s.items} onTap={handleTap} />
      ))}
    </div>
  );
}