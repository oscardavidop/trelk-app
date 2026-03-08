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
      document.documentElement.style.setProperty('--tg-top2-offset', `3.5rem`); // Aseguramos que --tg-top2-offset siempre tenga un valor
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
      className={`fixed left-0 right-0 z-[200] flex justify-center pointer-events-none transition-all duration-500 ease-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      // Añadimos 8px de margen para que flote como una píldora y no choque con el Notch/Header
      style={{ top: topPx > 0 ? topPx + 8 : 8 }}
    >
      {/* ── Diseño de Isla Premium (Glassmorphism) ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-full pointer-events-auto">

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-4 h-4 rounded-full object-cover ring-1 ring-white/20"
          />
        ) : (
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center ring-1 ring-white/20 shadow-inner">
            <span className="text-[10px] font-bold text-white ">
              {initials}
            </span>
          </div>
        )}

        <span className="text-[13px] font-semibold text-white/95 truncate max-w-[130px] tracking-wide pr-1">
          {name}
        </span>
      </div>
    </div>
  );
}

export function HidenTopIsland() {
  return (
    <div className="h-10" />
  );
}