import { Outlet, useLocation } from 'react-router-dom';
import { useBackButton } from '../hooks/useBackButton';
import TopIsland from './TopIsland';
import BottomNav from './BottomNav';
import { useUserStore } from '../stores';

/* Routes where the bottom nav should be visible (main 4 tabs) */
const TAB_SUFFIXES = ['', '/', '/hub', '/settings-hub', '/profile-tab'];

export default function AppLayout() {
  useBackButton();
  const location = useLocation();
  const user = useUserStore((s) => s.user);

  const name = user?.authTelegram?.first_name || 'User';
  const avatar = user?.authTelegram?.photo_url;

  /* Detect if current route is a main tab */
  const pathParts = location.pathname.split('/users/ui/')[1] || '';
  const subPath = '/' + pathParts.split('/').slice(1).join('/');
  const isMainTab = TAB_SUFFIXES.includes(subPath);

  return (
    <div className="relative min-h-screen">
      <TopIsland name={name} avatarUrl={avatar} />
      <div
        key={location.pathname}
        className="animate-fade-in"
        style={{
          paddingTop: 'var(--tg-top-offset, --tg-top2-offset)',
          paddingBottom: isMainTab ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)' : undefined,
        }}
      >
        <Outlet />
      </div>
      {isMainTab && <BottomNav />}
    </div>
  );
}
