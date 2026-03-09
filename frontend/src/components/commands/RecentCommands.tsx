import { useCallback, useState, useEffect, useRef } from 'react';
import { ChevronRight, Copy, Loader2, Terminal } from 'lucide-react';
import { fetchHistory, HistoryEntry } from '@/services/historyApi';

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

const PAGE_SIZE = 5;

export default function RecentCommands({ onTap }: RecentCommandsProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Usamos una referencia mutable para el bloqueo. 
  // Esto no causará re-renders ni romperá el useCallback.
  const isFetching = useRef(false);

  const loadLasted = useCallback(async () => {
    if (isFetching.current) return;
    
    isFetching.current = true;
    setLoading(true);
    
    try {
      const data = await fetchHistory(PAGE_SIZE, 0);
      setHistory((prev) => {
        const ids = new Set(prev.map((e) => e._id));
        const next = data.items.filter((e) => !ids.has(e._id));
        return [...prev, ...next];
      });
    } catch {
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isFetching.current = false; // Liberamos el bloqueo
    }
  }, []); // <-- Dependencias vacías: la función nunca cambia de referencia

  useEffect(() => {
    loadLasted();
  }, [loadLasted]); // Al ser estable, esto se ejecutará solo una vez al montar

  const cmdEntries = history.filter((h) => h.type === 'command').slice(0, 5);

  if (loading) {
    return (
      <div className="w-full py-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-tg-hint" />
      </div>
    );
  }

  return (
    <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
      <div className="divide-y divide-white/5">
     {cmdEntries.map((e) => (
          <div
            key={e._id}
            onClick={() => onTap?.(e.command!)}
            className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] group cursor-pointer"
          >
            {/* ── Lado Izquierdo (Icono + Textos) ── */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              
              <div className="w-9 h-9 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-105">
                <Terminal size={16} className="text-tg-accent" strokeWidth={2.5} />
              </div>

              {/* ── Textos apilados (una debajo de otra) ── */}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="text-[14px] text-tg-text truncate">
                  <span className="text-tg-hint/80 font-normal mr-1.5">Usó</span>
                  <span className="font-bold font-mono tracking-tight">{e.command}</span>
                  {e.args && (
                    <span className="text-[13px] font-medium text-tg-accent/80 font-sans italic ml-1.5">
                      "{e.args}"
                    </span>
                  )}
                </div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">
                  hace {timeAgo(e.timestamp)}
                </div>
              </div>
            </div>

            {/* ── Botón Copiar (Centrado a la derecha) ── */}
            <button
              onClick={(ev) => {
                ev.stopPropagation(); // Evita que al hacer clic en copiar se dispare el onTap de la fila
                navigator.clipboard.writeText(`/${e.command} ${e.args || ''}`.trim());
              }}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-transparent hover:bg-white/10 text-tg-hint hover:text-tg-text transition-all flex-shrink-0 active:scale-95 ml-3"
              title="Copiar comando"
            >
              <Copy size={16} />
            </button>

          </div>
        ))}
      </div>
    </div>
  );
}