import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';

const tabs = [
  {
    key: 'home',
    label: 'Home',
    path: '',
    icon: (active: boolean) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    key: 'commands',
    label: 'Comandos',
    path: '/hub',
    icon: (active: boolean) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Ajustes',
    path: '/settings-hub',
    icon: (active: boolean) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Perfil',
    path: '/profile-tab',
    icon: (active: boolean) => (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { haptic } = useTelegram();

  const basePath = `/users/ui/${userId}`;

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === basePath || path === `${basePath}/`) return 'home';
    if (path.startsWith(`${basePath}/hub`)) return 'commands';
    if (path.startsWith(`${basePath}/settings-hub`)) return 'settings';
    if (path.startsWith(`${basePath}/profile-tab`)) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="btm-nav">
      {tabs.map((tab) => {
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
            className={`btm-nav-item ${isActive ? 'btm-nav-active' : ''}`}
          >
            <span className={`btm-nav-icon ${isActive ? 'text-tg-accent' : 'text-tg-hint'}`}>
              {tab.icon(isActive)}
            </span>
            <span className={`btm-nav-label ${isActive ? 'text-tg-accent' : 'text-tg-hint'}`}>
              {tab.label}
            </span>
            {isActive && <span className="btm-nav-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
