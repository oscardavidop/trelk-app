import { useGamificationStore } from '../../stores/gamification';
import { ChevronRight } from 'lucide-react';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface RecentCommandsProps {
  onTap?: (cmd: string) => void;
}

export default function RecentCommands({ onTap }: RecentCommandsProps) {
  const { history } = useGamificationStore();
  const cmdEntries = history.filter((h) => h.type === 'command').slice(0, 5);

  if (cmdEntries.length === 0) return null;

  return (
    <div className="bg-tg-secondary rounded-[20px] border border-tg-border/20 overflow-hidden">
      <div className="divide-y divide-tg-border/10">
        {cmdEntries.map((e) => (
          <button
            key={e.id}
            onClick={() => onTap?.(e.command!)}
            className="w-full flex items-center gap-3 p-3.5 text-left active:bg-tg-surface/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-[10px] bg-tg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-tg-accent">▶</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-tg-text font-mono truncate">
                {e.command}{e.args ? ` ${e.args}` : ''}
              </div>
              <div className="text-[11px] text-tg-hint mt-0.5">hace {timeAgo(e.timestamp)}</div>
            </div>
            <ChevronRight size={16} className="text-tg-hint/40 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
