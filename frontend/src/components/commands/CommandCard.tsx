import { motion } from 'framer-motion';
import type { BotCommand } from '../../data/botCommands';
import { cmdSlug, CATEGORY_META } from '../../data/botCommands';
import { getCategoryBrand } from '../../design';
import { ChevronRight, UnlinkIcon } from 'lucide-react';
import { usePrefetch } from '../../hooks/usePrefetch';
import { fetchCommandStats, fetchReviewsSummary } from '../../services/commandStatsApi';

interface Props {
    cmd: BotCommand;
    onClick: (slug: string) => void;
    compact?: boolean;
}

export default function CommandCard({ cmd, onClick, compact }: Props) {
    const slug = cmdSlug(cmd);
    const cat = CATEGORY_META[cmd.category] ?? { label: cmd.category, color: '#6b7280', icon: UnlinkIcon };
    const brand = getCategoryBrand(cmd.category);

    const { prefetch } = usePrefetch({
        queryKey: ['command-stats', slug],
        queryFn: () => fetchCommandStats(slug),
        staleTime: 60_000,
    });

    const { prefetch: prefetchSummary } = usePrefetch({
        queryKey: ['reviews-summary', slug],
        queryFn: () => fetchReviewsSummary(slug),
        staleTime: 60_000,
    });

    const handlePrefetch = () => { prefetch(); prefetchSummary(); };

    // -- MODO COMPACTO --
    if (compact) {
        return (
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onClick(slug)}
                onMouseEnter={handlePrefetch}
                onTouchStart={handlePrefetch}
                className="w-full flex items-center gap-3.5 p-3.5 text-left transition-colors border-b border-tg-border/20 last:border-0"
            >
                <div
                    className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
                >
                    <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text font-mono truncate leading-tight">/{slug}</div>
                    <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{cmd.description}</div>
                </div>
                <ChevronRight size={18} className="text-tg-hint/40 flex-shrink-0" />
            </motion.button>
        );
    }

    // -- MODO NORMAL --
    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onClick(slug)}            onMouseEnter={handlePrefetch}
            onTouchStart={handlePrefetch}            className="w-full relative rounded-[20px] p-4 text-left overflow-hidden bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 shadow-sm group transition-all duration-200"
        >
            {/* Category glow */}
            <div
                className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ background: brand.glow }}
            />

            {/* Top shine line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-3.5">
                <div
                    className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-sm border border-white/5 group-active:scale-95 transition-transform duration-200"
                    style={{ backgroundColor: `${cat.color}20` }}
                >
                    {typeof cat.icon === 'string'
                        ? <span className="text-xl">{cat.icon}</span>
                        : <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                    }
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[15px] font-bold text-tg-text font-mono truncate leading-tight">/{slug}</div>
                    <p className="text-[13px] font-medium text-tg-hint mt-1 leading-snug line-clamp-2">{cmd.description}</p>

                    {/* Category + Feature Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                            style={{ color: cat.color, backgroundColor: `${cat.color}12`, border: `1px solid ${cat.color}25` }}
                        >
                            {cat.label}
                        </span>
                        {cmd.supportsInline && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-sky-500 bg-sky-500/10 border border-sky-500/20">
                                Inline
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.button>
    );
}