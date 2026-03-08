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
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pb-1">
      {commands.map((cmd) => {
        const slug = cmdSlug(cmd);
        const cat = CATEGORY_META[cmd.category];
        const CatIcon = cat?.icon;
        return (
          <button
            key={slug}
            onClick={() => onRun?.(cmd)}
            className="flex-shrink-0 flex items-center gap-2 bg-tg-secondary border border-tg-border/20 rounded-full px-4 py-2.5 active:scale-95 transition-all"
          >
            {CatIcon && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: `${cat.color}15` }}
              >
                <CatIcon size={13} style={{ color: cat.color }} />
              </div>
            )}
            <span className="text-[13px] font-bold text-tg-text font-mono">/{slug}</span>
          </button>
        );
      })}
    </div>
  );
}
