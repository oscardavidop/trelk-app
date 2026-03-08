import type { BotCommand } from '../../data/botCommands';
import { cmdSlug, CATEGORY_META } from '../../data/botCommands';
import { ChevronRight, UnlinkIcon } from 'lucide-react';

interface Props {
    cmd: BotCommand;
    onClick: (slug: string) => void;
    compact?: boolean;
}

export default function CommandCard({ cmd, onClick, compact }: Props) {
    const slug = cmdSlug(cmd);
    const cat = CATEGORY_META[cmd.category] ?? { label: cmd.category, color: '#6b7280', icon: UnlinkIcon };

    // ── MODO COMPACTO (Para listas largas dentro de un contenedor divide-y) ──
    if (compact) {
        return (
            <button
                onClick={() => onClick(slug)}
                className="w-full flex items-center gap-3.5 p-4 text-left transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"
            >
                <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner"
                    style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
                >
                    <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-tg-text font-mono tracking-tight truncate">/{slug}</div>
                    <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{cmd.description}</div>
                </div>
                <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>
        );
    }

    // ── MODO NORMAL (Para tarjetas individuales o grillas) ──
    return (
        <button
            onClick={() => onClick(slug)}
            className="w-full bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 text-left transition-all active:scale-[0.97] hover:bg-white/[0.02] shadow-sm group"
        >
            <div className="flex items-start gap-4">
                <div
                    className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
                >
                    <cat.icon className="w-6 h-6" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[16px] font-extrabold text-tg-text font-mono tracking-tight truncate">/{slug}</div>
                    <p className="text-[13px] font-medium text-tg-hint/90 mt-1.5 leading-snug line-clamp-2">{cmd.description}</p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3.5">
                        <span
                            className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm"
                            style={{ color: cat.color, backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
                        >
                            {cat.label}
                        </span>
                        {cmd.supportsInline && (
                            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm text-blue-400 bg-blue-500/10 border border-blue-500/20">
                                Inline
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}