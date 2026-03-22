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

    // ── MODO COMPACTO (Para listas estilo iOS/Telegram Settings) ──
    if (compact) {
        return (
            <button
                onClick={() => onClick(slug)}
                className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
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
            </button>
        );
    }

    // ── MODO NORMAL (Para tarjetas individuales o listas anchas) ──
    return (
        <button
            onClick={() => onClick(slug)}
            className="w-full bg-tg-secondary rounded-[20px] border border-tg-border/40 p-4 text-left transition-all duration-200 active:scale-[0.98] shadow-sm group"
        >
            <div className="flex items-start gap-3.5">
                <div
                    className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95"
                    style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
                >
                    <cat.icon className="w-6 h-6" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[16px] font-bold text-tg-text font-mono truncate leading-tight">/{slug}</div>
                    <p className="text-[13px] font-medium text-tg-hint mt-1 leading-snug line-clamp-2">{cmd.description}</p>

                    {/* Badges Premium */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm"
                            style={{ color: cat.color, backgroundColor: `${cat.color}10`, border: `1px solid ${cat.color}20` }}
                        >
                            {cat.label}
                        </span>
                        {cmd.supportsInline && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm text-sky-500 bg-sky-500/10 border border-sky-500/20">
                                Inline
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}