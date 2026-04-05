import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistoryEntry } from '../../services/historyApi';
import { useToastStore } from '../../stores';
import { Terminal, Heart, Trophy, Copy, Check, Circle, CheckCircle2 } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

function timeAgo(ts: number, t: (key: string, opts?: any) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('common:now', 'now');
  if (mins < 60) return t('common:ago_mins', { count: mins, defaultValue: `${mins}m ago` });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('common:ago_hours', { count: hrs, defaultValue: `${hrs}h ago` });
  const days = Math.floor(hrs / 24);
  return t('common:ago_days', { count: days, defaultValue: `${days}d ago` });
}

interface ActivityItemProps {
  entry: HistoryEntry;
  onRerun?: (cmd: string, args?: string) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

export default function ActivityItem({ entry: e, onRerun, selectMode, isSelected, onToggleSelect, onLongPress }: ActivityItemProps) {
  const { t } = useTranslation('activity');
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

  // Configuración visual nativa y adaptativa
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

  const renderText = () => {
    if (e.type === 'command') {
      return (
        <div className="min-w-0 flex flex-wrap items-center gap-1">
          <span className="font-mono text-tg-accent font-bold tracking-tight">/{e.command}</span>
          {e.args && <span className="text-tg-hint/80 italic text-[13px] truncate max-w-[120px]">"{e.args}"</span>}
        </div>
      );
    }
    if (e.type === 'favorite_added') {
      return (
        <p className="text-[14px] text-tg-text/90 leading-tight">
          {t('saved', 'Saved')} <span className="font-bold text-tg-text">"{e.item}"</span> {t('in_favorites', 'to favorites')}
        </p>
      );
    }
    if (e.type === 'achievement') {
      return (
        <p className="text-[14px] text-tg-text/90 leading-tight">
          {t('unlocked_achievement', 'Unlocked')} <span className="font-bold text-amber-500">"{e.achievementName}"</span>
        </p>
      );
    }
    return <span className="text-tg-hint">{t('unknown_action', 'Unknown action')}</span>;
  };

  const { Icon, bg, border, color } = getConfig();

  // Long-press handler
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handlePointerDown = useCallback(() => {
    if (selectMode) return;
    longPressTimer.current = setTimeout(() => {
      haptic?.impactOccurred('medium');
      onLongPress?.();
    }, 500);
  }, [selectMode, haptic, onLongPress]);
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleClick = () => {
    if (selectMode) {
      haptic?.impactOccurred('light');
      onToggleSelect?.();
    }
  };

  return (
    <div
      className={`w-full flex items-center gap-3.5 p-4 active:bg-tg-hint/5 transition-colors group ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-tg-accent/5' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
    >
      {/* ── Select checkbox ── */}
      {selectMode && (
        <div className="flex-shrink-0">
          {isSelected
            ? <CheckCircle2 size={22} className="text-tg-accent" />
            : <Circle size={22} className="text-tg-hint/30" />
          }
        </div>
      )}
      
      {/* ── Icono Estilo iOS ── */}
      <div className={`w-[42px] h-[42px] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm border ${bg} ${border} transition-transform duration-200 group-active:scale-90`}>
        <Icon className={`w-5 h-5 ${color} drop-shadow-sm`} />
      </div>

      {/* ── Contenido Principal ── */}
      <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
        
        <div className="flex flex-col min-w-0">
          <div className="text-[15px] text-tg-text leading-snug truncate">
            {renderText()}
          </div>
          <span className="text-[12px] font-medium text-tg-hint mt-0.5 flex items-center gap-1">
            {timeAgo(e.timestamp || Date.now(), t)}
          </span>
        </div>

        {/* ── Acción: Botón Copiar ── */}
        <div className="flex-shrink-0">
          {e.type === 'command' && e.command && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleCopy();
              }}
              className={`flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-200 border shadow-sm ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-tg-hint/10 border-tg-border/30 text-tg-hint hover:text-tg-text'
              }`}
            >
              {copied ? (
                <Check size={14} strokeWidth={3} className="animate-scale-in" />
              ) : (
                <Copy size={14} strokeWidth={2.5} />
              )}
              <span className="uppercase tracking-wider text-[10px]">{copied ? t('common:copied') : t('common:copy')}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}