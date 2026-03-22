import { useMemo, useState, useEffect } from 'react';
import { useIslandStore } from '../stores/islandStore';

interface TopIslandProps {
  name: string;
  avatarUrl?: string;
}

export default function TopIsland({ name, avatarUrl }: TopIslandProps) {
  const visible = useIslandStore((s) => s.visible);

  const isMobile = useMemo(() => document.body.classList.contains('mobile'), []);

  const [topPx, setTopPx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      document.documentElement.style.setProperty('--tg-top-offset', `0px`);
      document.documentElement.style.setProperty('--tg-top2-offset', `0px`);
      return;
    } else {
      document.documentElement.style.setProperty('--tg-top-offset', `0px`);
      document.documentElement.style.setProperty('--tg-top2-offset', `3.5rem`);
    }

    const update = () => {
      const wa = (window as any).Telegram?.WebApp;
      const deviceTop = wa?.safeAreaInset?.top ?? 0;
      const tgHeader = wa?.contentSafeAreaInset?.top ?? 0;
      setTopPx(deviceTop);
      document.documentElement.style.setProperty('--tg-top-offset', `${deviceTop + tgHeader}px`);
      requestAnimationFrame(() => setIsVisible(true));
    };

    update();

    const wa = (window as any).Telegram?.WebApp;
    wa?.onEvent?.('safeAreaChanged', update);
    wa?.onEvent?.('contentSafeAreaChanged', update);

    return () => {
      wa?.offEvent?.('safeAreaChanged', update);
      wa?.offEvent?.('contentSafeAreaChanged', update);
    };
  }, [isMobile]);

  if (!isMobile || !visible) return null;

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`fixed left-0 right-0 z-[200] flex justify-center pointer-events-none transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
      }`}
      // Si Telegram no reporta safeArea, usamos la variable de entorno nativa de iOS como fallback
      style={{ top: topPx > 0 ? topPx + 8 : 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      {/* ── Diseño de Isla Premium Adaptativa ── */}
      <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-tg-secondary/85 backdrop-blur-xl border border-tg-border/40 shadow-sm rounded-full pointer-events-auto transition-colors">

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-tg-border/50 shadow-sm"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center shadow-inner">
            <span className="text-[9px] font-bold text-tg-accent tracking-wider">
              {initials}
            </span>
          </div>
        )}

        <span className="text-[13px] font-semibold text-tg-text truncate max-w-[140px] tracking-wide pr-1.5">
          {name}
        </span>
      </div>
    </div>
  );
}

// Nota: Corregí el nombre de 'Hiden' a 'Hidden'. Asegúrate de actualizar la importación donde lo uses.
export function HiddenTopIsland() {
  return (
    <div className="h-10 w-full flex-shrink-0" aria-hidden="true" />
  );
}