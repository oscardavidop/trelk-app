import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, Settings, User, Bell } from 'lucide-react';
import { useNotificationsStore } from '../stores/notifications';

const TAB_KEYS = [
  {
    key: 'home',
    labelKey: 'home',
    path: '',
    icon: (active: boolean) => (
      // Cambiado de text-tg-hint/70 a text-tg-hint
      <Home size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-tg-accent' : 'text-tg-hint'} />
    ),
  },
  {
    key: 'commands',
    labelKey: 'commands',
    path: '/hub',
    icon: (active: boolean) => (
      <LayoutGrid size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-tg-accent' : 'text-tg-hint'} />
    ),
  },
  {
    key: 'profile',
    labelKey: 'profile',
    path: '/profile-tab',
    icon: (active: boolean) => (
      <User size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-tg-accent' : 'text-tg-hint'} />
    ),
  },
  {
    key: 'notifications',
    labelKey: 'notifications',
    path: '/notifications',
    icon: (active: boolean) => (
      <Bell size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-tg-accent' : 'text-tg-hint'} />
    ),
  },
  {
    key: 'settings',
    labelKey: 'settings',
    path: '/settings-hub',
    icon: (active: boolean) => (
      <Settings size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-tg-accent' : 'text-tg-hint'} />
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { haptic } = useTelegram();
  const { t } = useTranslation('navigation');
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const basePath = `/users/ui/${userId}`;

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === basePath || path === `${basePath}/`) return 'home';
    if (path.startsWith(`${basePath}/hub`)) return 'commands';
    if (path.startsWith(`${basePath}/settings-hub`)) return 'settings';
    if (path.startsWith(`${basePath}/profile-tab`)) return 'profile';
    if (path.startsWith(`${basePath}/notifications`)) return 'notifications';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[480px] pointer-events-auto pb-[env(safe-area-inset-bottom)] bg-tg-bg/85 backdrop-blur-xl border-t border-tg-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around px-2 py-1.5 h-[64px]">
          {TAB_KEYS.map((tab) => {
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (!isActive) {
                    haptic?.impactOccurred('light');
                    navigate(`${basePath}${tab.path}`);
                  }
                }}
                // Eliminado opacity-80 del estado inactivo para no perder legibilidad
                className="relative flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-300"
              >
                {/* ── Indicador Activo (Fondo aumentado a 15% para mejor contraste en light mode) ── */}
                <div 
                  className={`absolute top-0 bottom-5 w-[48px] rounded-full transition-all duration-300 z-0 ${
                    isActive ? 'bg-tg-accent/15 scale-100 opacity-100' : 'bg-transparent scale-50 opacity-0'
                  }`} 
                />

                {/* ── Ícono ── */}
                <span className="relative z-10 flex items-center justify-center transition-transform duration-300">
                  {tab.icon(isActive)}
                  
                  {/* ── Badge de Notificaciones ── */}
                  {tab.key === 'notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-tg-bg shadow-sm z-20 animate-scale-in">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                
                {/* ── Texto ── */}
                <span 
                  className={`relative z-10 text-[10px] tracking-wide transition-all duration-300 font-semibold ${
                    isActive ? 'text-tg-accent translate-y-0' : 'text-tg-hint translate-y-px'
                  }`}
                >
                  {t(tab.labelKey, tab.key.charAt(0).toUpperCase() + tab.key.slice(1))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}