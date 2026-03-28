import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, Zap, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META, cmdSlug } from '../../../data/botCommands';
import type { BotCommand } from '../../../data/botCommands';
import type { CommandStatsData } from '../../../services/commandStatsApi';
import { useTelegram } from '../../../hooks/useTelegram';

interface Props {
    cmd: BotCommand;
    stats: CommandStatsData | null;
    isFav: boolean;
    onToggleFav: () => void;
    onCollapseChange?: (collapsed: boolean) => void;
}

const COLLAPSE_BUFFER = 30;

function CommandHero({ cmd, stats, isFav, onToggleFav, onCollapseChange }: Props) {
    const { t } = useTranslation('commandDetail');
    const { haptic } = useTelegram();
    const slug = cmdSlug(cmd);
    const cat = CATEGORY_META[cmd.category] ?? { label: cmd.category, color: '#6b7280', icon: '📦' };

    const [collapsed, setCollapsed] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const cbRef = useRef(onCollapseChange);
    cbRef.current = onCollapseChange;

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        let io: IntersectionObserver | null = null;
        let cooldown = false;
        let lastTopPx = -1;

        const createObserver = () => {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--tg-top-offset').trim();
            const topPx = parseFloat(raw) || 0;

            if (topPx === lastTopPx && io) return;
            lastTopPx = topPx;

            io?.disconnect();
            io = new IntersectionObserver(
                ([entry]) => {
                    if (cooldown) return;
                    const next = !entry.isIntersecting;
                    setCollapsed(prev => {
                        if (prev === next) return prev;
                        cooldown = true;
                        setTimeout(() => { cooldown = false; }, 100);
                        cbRef.current?.(next);
                        return next;
                    });
                },
                {
                    rootMargin: `${Math.round(COLLAPSE_BUFFER - topPx)}px 0px 0px 0px`,
                    threshold: 0,
                },
            );
            io.observe(el);
        };

        const mo = new MutationObserver(() => createObserver());
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
        requestAnimationFrame(createObserver);

        return () => { io?.disconnect(); mo.disconnect(); };
    }, []);

    /* ── Touch gesture ── */
    const touchRef = useRef({ y: 0, scrollY: 0, time: 0 });

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchRef.current = { y: e.touches[0].clientY, scrollY: window.scrollY, time: Date.now() };
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        const { y: startY, scrollY: startScroll, time: startTime } = touchRef.current;
        const deltaY = e.changedTouches[0].clientY - startY;
        const elapsed = Date.now() - startTime;
        const scrollMoved = Math.abs(window.scrollY - startScroll);

        if (elapsed > 180 && scrollMoved < 15 && deltaY > 40 && collapsed) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            haptic?.impactOccurred('light');
        }
    }, [collapsed, haptic]);

    const handleExpand = useCallback(() => {
        if (collapsed) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            haptic?.impactOccurred('light');
        }
    }, [collapsed, haptic]);

    /* ── Badges ── */
    const badges: { label: string; icon: typeof Star; color: string }[] = [];
    if (stats && stats.rating >= 4.5) badges.push({ label: `${stats.rating.toFixed(1)}`, icon: Star, color: '#f59e0b' });
    if (stats && stats.weeklyUses >= 5000) badges.push({ label: t('trending'), icon: Flame, color: '#ef4444' });
    badges.push({ label: t('fast_badge', 'Fast'), icon: Zap, color: '#10b981' });

    return (
        <>
            {/* Sentinel */}
            <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

            <div
                className={`sticky z-30 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                    collapsed
                        ? 'bg-tg-bg backdrop-blur-xl border-b border-tg-border/50 shadow-sm'
                        : 'bg-tg-bg border-b border-transparent'
                }`}
                style={{ top: 'var(--tg-top-offset, 0px)' }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* ── FIX TAPA HUECO (Overscroll solid fill) ── */}
                <div
                    className="absolute left-0 right-0 pointer-events-none transition-all duration-300"
                    style={{
                        top: 'calc(var(--tg-top-offset, 0px) * -1.2)',
                        height: 'calc(var(--tg-top-offset, 0px) * 1.5)',
                        background: 'var(--tg-bg)',
                        opacity: collapsed ? 1 : 0,
                    }}
                />

                {/* Unified background with fixed gradient */}
                {/* <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute inset-0 transition-opacity duration-300 ease-out"
                        style={{
                            background: `radial-gradient(120% 120% at 20% 0%, ${cat.color}, transparent 70%)`,
                            opacity: collapsed ? 0 : 0.12,
                        }}
                    />
                </div> */}

                <div className={`relative px-5 transition-[padding] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${collapsed ? 'py-2' : 'pt-5 pb-3'}`}>
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                            className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                                collapsed
                                    ? 'w-[42px] h-[42px] rounded-[12px] text-[20px]'
                                    : 'w-[72px] h-[72px] rounded-[22px] text-[32px]'
                            }`}
                            style={{
                                backgroundColor: `${cat.color}18`,
                                border: `1.5px solid ${cat.color}35`,
                                boxShadow: `0 0 24px ${cat.color}15`,
                            }}
                        >
                            {typeof cat.icon !== 'string' ? (
                                <cat.icon
                                    className={`transition-all duration-300 ${collapsed ? 'w-5 h-5' : 'w-8 h-8'}`}
                                    style={{ color: cat.color }}
                                />
                            ) : (
                                cat.icon
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 pr-12">
                            <h1 className={`font-bold font-mono text-tg-text truncate transition-all duration-300 ${collapsed ? 'text-[18px]' : 'text-[26px]'}`}>
                                /{slug}
                            </h1>

                            <p className={`text-tg-hint text-[13px] leading-snug transition-all duration-300 ${collapsed ? 'line-clamp-1 mt-0.5' : 'line-clamp-2 mt-1'}`}>
                                {cmd.description}
                            </p>

                            {/* Smooth expansion using Grid trick */}
                            <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                                collapsed ? 'grid-rows-[0fr] opacity-0 mt-0' : 'grid-rows-[1fr] opacity-100 mt-3'
                            }`}>
                                <div className="overflow-hidden flex flex-wrap gap-2 items-start">
                                    <span
                                        className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
                                        style={{
                                            color: cat.color,
                                            backgroundColor: `${cat.color}12`,
                                            border: `1px solid ${cat.color}25`,
                                        }}
                                    >
                                        {cat.label}
                                    </span>

                                    {cmd.supportsInline && (
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-sky-500 bg-sky-500/10 border border-sky-500/20 uppercase tracking-wider">
                                            Inline
                                        </span>
                                    )}

                                    {badges.map((b, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"
                                            style={{
                                                color: b.color,
                                                backgroundColor: `${b.color}12`,
                                                border: `1px solid ${b.color}25`,
                                            }}
                                        >
                                            <b.icon size={10} /> {b.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fav Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={onToggleFav}
                        className={`absolute right-5 flex items-center justify-center rounded-full bg-tg-secondary/80 backdrop-blur-md border border-tg-border/40 shadow-sm transition-all duration-300 ${
                            collapsed ? 'top-2.5 w-[38px] h-[38px]' : 'top-6 w-[44px] h-[44px]'
                        }`}
                    >
                        <motion.div
                            animate={isFav ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            <Heart
                                size={18}
                                className={isFav ? 'text-pink-500 fill-pink-500' : 'text-tg-hint/60'}
                            />
                        </motion.div>
                    </motion.button>

                    {/* Drag indicator (only visible when collapsed) */}
                    <div
                        className={`flex justify-center transition-all duration-300 overflow-hidden cursor-pointer ${
                            collapsed ? 'max-h-4 opacity-60 mt-1' : 'max-h-0 opacity-0 mt-0'
                        }`}
                        onClick={handleExpand}
                    >
                        <div className="w-8 h-[3px] rounded-full bg-tg-hint/40" />
                    </div>
                </div>
            </div>
        </>
    );
}

export default memo(CommandHero);