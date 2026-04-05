import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { useBackButton } from '../hooks/useBackButton';
import TopIsland from './TopIsland';
import BottomNav from './BottomNav';
import NotificationIsland from './ui/NotificationIsland';
import NotificationToast from './ui/NotificationToast';
import NotificationDebugPanel from './ui/NotificationDebugPanel';
import { useLiveNotifications } from '../hooks/useLiveNotifications';
import { useUserStore } from '../stores';
import { useSwipeBack } from '../hooks/useGestures';
import { Suspense, useState } from 'react';
import SettingsPageFallback from '@/pages/fallbacks/SettingsPageFallback';
import CommandsHubFallback from '@/pages/fallbacks/CommandsHubFallback';
import BotCommandsPageFallback from '@/pages/fallbacks/BotCommandsPageFallback';
import CommandReviewsFallback from '@/pages/fallbacks/CommandReviewsFallback';

const PAGE_FALLBACKS: Record<string, React.ReactNode> = {
  '/settings-hub': <SettingsPageFallback />,
  '/hub': <CommandsHubFallback />,
  '/bot-commands': <BotCommandsPageFallback />,
  '/reviews': <CommandReviewsFallback />,

};


/* Routes where the bottom nav should be visible (main 4 tabs + notifications) */
const TAB_SUFFIXES = ['', '/', '/hub', '/settings-hub', '/profile-tab', '/notifications'];

export function PageFallback() {
  return (
    // Aplicamos el pulse al contenedor principal para que todo palpite sincronizado
    <div
      className="flex flex-col w-full min-h-[60vh] p-4 pt-6 animate-pulse"
      aria-hidden="true" // Buena práctica para accesibilidad
    >
      <div className="w-full max-w-md mx-auto">

        {/* Falso Header (Simula un título o un perfil) */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-full bg-tg-text/15 shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-5 w-2/3 bg-tg-text/15 rounded-md" />
            <div className="h-4 w-1/3 bg-tg-text/10 rounded-md" />
          </div>
        </div>

        {/* Falsos Párrafos (Simula descripción o contenido de texto) */}
        <div className="space-y-3 mb-8">
          <div className="h-4 w-full bg-tg-text/10 rounded-md" />
          <div className="h-4 w-[90%] bg-tg-text/10 rounded-md" />
          <div className="h-4 w-[75%] bg-tg-text/10 rounded-md" />
        </div>

        {/* Falsas Tarjetas (Simula una cuadrícula de botones o stats) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 bg-tg-text/10 rounded-[20px]" />
          <div className="h-28 bg-tg-text/10 rounded-[20px]" />
          <div className="h-28 bg-tg-text/10 rounded-[20px]" />
          <div className="h-28 bg-tg-text/10 rounded-[20px]" />
        </div>

      </div>
    </div>
  );
}

export default function AppLayout() {
  useBackButton();
  useSwipeBack();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  useLiveNotifications();

  const [useSafeProps, setUseSafeProps] = useState(true);
  const name = user?.authTelegram?.first_name || 'User';
  const avatar = user?.authTelegram?.photo_url;

  /* Detect if current route is a main tab */
  const pathParts = location.pathname.split('/users/ui/')[1] || '';
  const subPath = '/' + pathParts.split('/').slice(1).join('/');
  const isMainTab = TAB_SUFFIXES.includes(subPath);
  const fallback = PAGE_FALLBACKS[subPath] || <PageFallback />;


  return (
    <div className="relative min-h-screen">
      <TopIsland name={name} avatarUrl={avatar} />
      <NotificationIsland />
      <NotificationToast />
      <div
        style={{
          paddingTop: useSafeProps
            ? 'var(--tg-top-offset, var(--tg-top2-offset, 0px))'
            : '0px',
          paddingBottom: (isMainTab && useSafeProps)
            ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
            : '0px',
        }}
      >
        <Suspense fallback={fallback}>
          <Outlet context={{ setUseSafeProps }}/>
           {/* <ScrollRestoration /> */}
        </Suspense>
      </div>
      {isMainTab && <BottomNav />}
      {/* <NotificationDebugPanel /> */}
    </div>
  );
}
