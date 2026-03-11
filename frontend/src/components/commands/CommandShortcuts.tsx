import { BOT_COMMANDS, CATEGORY_META, cmdSlug } from '../../data/botCommands';
import type { BotCommand } from '../../data/botCommands';

const SHORTCUT_SLUGS = ['play', 'translate', 'ssweb', 'chatgpt', 'akinator', 'img'];

interface CommandShortcutsProps {
  onRun?: (cmd: BotCommand) => void;
}

export default function CommandShortcuts({ onRun }: CommandShortcutsProps) {
  const commands = SHORTCUT_SLUGS
    .map((s) => BOT_COMMANDS.find((c) => cmdSlug(c) === s))
    .filter(Boolean) as BotCommand[];

  return (
    <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {commands.map((cmd) => {
        const slug = cmdSlug(cmd);
        const cat = CATEGORY_META[cmd.category];
        const CatIcon = cat?.icon;
        
        // Verificamos si es un componente de Lucide o un simple string/emoji
        const isComponent = typeof CatIcon !== 'string';

        return (
          <button
            key={slug}
            onClick={() => onRun?.(cmd)}
            className="flex-shrink-0 flex items-center gap-2.5 bg-tg-secondary border border-tg-border/50 shadow-sm rounded-full pl-2 pr-4 py-2 active:scale-95 transition-transform hover:bg-white/[0.02] group"
          >
            {CatIcon && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${cat?.color}15`, border: `1px solid ${cat?.color}20` }}
              >
                {isComponent ? (
                  // @ts-ignore - Asumimos que si no es string, es un componente válido
                  <CatIcon size={14} style={{ color: cat.color }} />
                ) : (
                  <span className="text-[12px] drop-shadow-sm">{CatIcon}</span>
                )}
              </div>
            )}
            <span className="text-[14px] font-extrabold text-tg-text font-mono ">
              /{slug}
            </span>
          </button>
        );
      })}
    </div>
  );
}