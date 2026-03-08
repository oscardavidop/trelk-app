import { useState, useCallback } from 'react';
import type { HistoryEntry } from '../../stores/gamification';
import { useToastStore } from '../../stores';
import { Terminal, Heart, Trophy, Play, Copy, Check } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

interface ActivityItemProps {
  entry: HistoryEntry;
  onRerun?: (cmd: string, args?: string) => void;
}

export default function ActivityItem({ entry: e, onRerun }: ActivityItemProps) {
  const showToast = useToastStore((s) => s.show);
  const { haptic } = useTelegram();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = e.command ? `/${e.command}${e.args ? ' ' + e.args : ''}` : '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      haptic?.notificationOccurred('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      haptic?.notificationOccurred('error');
    }
  }, [e, haptic]);

  // Configuración visual según el tipo de actividad
  const getConfig = () => {
    switch (e.type) {
      case 'favorite_added':
        return { Icon: Heart, bg: 'bg-pink-500/10', border: 'border-pink-500/20', color: 'text-pink-500' };
      case 'achievement':
        return { Icon: Trophy, bg: 'bg-amber-500/10', border: 'border-amber-500/20', color: 'text-amber-500' };
      case 'command':
      default:
        return { Icon: Terminal, bg: 'bg-tg-accent/10', border: 'border-tg-accent/20', color: 'text-tg-accent' };
    }
  };

  // Renderizado dinámico del texto para resaltar elementos clave
  const renderText = () => {
    if (e.type === 'command') {
      return (
        <>
          Usó <span className="font-mono text-tg-accent font-semibold tracking-tight">{e.command}</span>
          {e.args && <span className="text-tg-hint/80 italic"> "{e.args}"</span>}
        </>
      );
    }
    if (e.type === 'favorite_added') {
      return (
        <>
          Guardó <span className="font-bold text-tg-text">"{e.item}"</span> en favoritos
        </>
      );
    }
    if (e.type === 'achievement') {
      return (
        <>
          Desbloqueó el logro <span className="font-bold text-amber-400">"{e.achievementName}"</span>
        </>
      );
    }
    return 'Acción desconocida';
  };

  const { Icon, bg, border, color } = getConfig();

  return (
    <div className="flex items-start gap-3.5 p-4 hover:bg-white/[0.02] transition-colors group">
      
      {/* ── Icono ── */}
      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner border ${bg} ${border}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[14px] text-tg-text/90 leading-snug">
          {renderText()}
        </p>
        <span className="text-[11px] font-medium text-tg-hint/70 mt-1 block tracking-wide">
          {timeAgo(e.timestamp)}
        </span>

        {/* ── Acciones (Solo para comandos) ── */}
        {e.type === 'command' && e.command && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                haptic?.impactOccurred('light');
                onRerun?.(e.command!, e.args);
              }}
              className="flex items-center gap-1.5 text-[11px] font-bold text-tg-accent bg-tg-accent/10 border border-tg-accent/20 px-3 py-1.5 rounded-full active:scale-95 transition-all hover:bg-tg-accent/20"
            >
              <Play size={12} className="fill-tg-accent/50" />
              Ejecutar
            </button>
            
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-all border ${
                copied 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-black/20 border-white/5 text-tg-hint hover:text-tg-text hover:bg-white/[0.04]'
              }`}
            >
              {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>
      
    </div>
  );
}