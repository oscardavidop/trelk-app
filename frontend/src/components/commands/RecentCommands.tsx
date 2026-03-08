import { useGamificationStore } from '../../stores/gamification';
import { ChevronRight, Terminal } from 'lucide-react';

// Formateo de tiempo ligeramente más limpio
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

interface RecentCommandsProps {
  onTap?: (cmd: string) => void;
}

export default function RecentCommands({ onTap }: RecentCommandsProps) {
  const { history } = useGamificationStore();
  const cmdEntries = history.filter((h) => h.type === 'command').slice(0, 5);

  if (cmdEntries.length === 0) return null;

  return (
    <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
      <div className="divide-y divide-white/5">
        {cmdEntries.map((e) => (
          <button
            key={e.id}
            onClick={() => onTap?.(e.command!)}
            className="w-full flex items-center gap-3.5 p-4 text-left transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] group"
          >
            {/* ── Icono ── */}
            <div className="w-9 h-9 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-105">
              <Terminal size={16} className="text-tg-accent" strokeWidth={2.5} />
            </div>
            
            {/* ── Textos ── */}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-tg-text font-mono tracking-tight truncate">
                {e.command}
                {e.args && (
                  <span className="text-[13px] font-medium text-tg-hint/70 font-sans italic ml-1.5">
                    {e.args}
                  </span>
                )}
              </div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5">
                hace {timeAgo(e.timestamp)}
              </div>
            </div>

            {/* ── Flecha ── */}
            <ChevronRight 
              size={18} 
              className="text-tg-hint/40 flex-shrink-0 transition-transform group-hover:translate-x-0.5" 
            />
          </button>
        ))}
      </div>
    </div>
  );
}