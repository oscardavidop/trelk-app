import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ── Route parentage map for smart fallback ── */
const PARENT_MAP: Record<string, string> = {
  '/settings': '/settings-hub',
  '/set/lang': '/settings-hub',
  '/set/timezone': '/settings-hub',
  '/set/country': '/settings-hub',
  '/set/theme': '/settings-hub',
  '/profile': '/settings-hub',
  '/my-reports': '/settings-hub',
  '/subscription': '/settings-hub',
  '/payments': '/settings-hub',
  '/premium': '/settings-hub',
};

/**
 * Hook para manejar el botón "Back" de Telegram WebApp.
 * Muestra el BackButton cuando NO estamos en la página raíz del usuario.
 * Uses location.state.from or a parent map for correct back navigation.
 */
export function useBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    // Rutas raíz donde no se muestra el BackButton
    const isRoot =
      location.pathname === '/trelk' ||
      /^\/users\/ui\/[^/]+\/?$/.test(location.pathname);

    if (isRoot) {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      const handler = () => {
        // Prefer explicit "from" state passed during navigation
        const currentPath = location.pathname;
        const from = (location.state as any)?.from;

        if (currentPath.includes('id')) {
          navigate('/trelk', { replace: true });
          // refresh the page to reset state, since some id pages might be "sticky"
          // refresh title
          setTimeout(() => {navigate(0)}, 100);
          return;
        }

        if (from) {
          navigate(from, { replace: true });
          return;
        }

        // Smart fallback: derive parent from PARENT_MAP
        const match = location.pathname.match(/^\/users\/ui\/([^/]+)(.*)/);
        if (match) {
          const [, uid, subPath] = match;
          const parent = PARENT_MAP[subPath];
          if (parent) {
            navigate(`/users/ui/${uid}${parent}`, { replace: true });
            return;
          }
        }

        navigate(-1);
      };
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
      };
    }
  }, [location.pathname, location.state, navigate]);
}

// export function useBackButton() {
//   const navigate = useNavigate();
//   const location = useLocation();

//   useEffect(() => {
//     const tg = window.Telegram?.WebApp;
//     if (!tg) return;

//     const isRoot =
//       location.pathname === '/trelk' ||
//       /^\/users\/ui\/[^/]+\/?$/.test(location.pathname);

//     if (isRoot) {
//       tg.BackButton.hide();
//       return;
//     }

//     tg.BackButton.show();

//     const handler = () => {
//       console.log('[App] Back button clicked');

//       const currentPath = location.pathname;

//       // 🔥 TU LÓGICA AQUÍ
//       if (currentPath.includes('id')) {
//         navigate('/');
//         return;
//       }

//       // fallback normal
//       navigate(-1);
//     };

//     tg.onEvent('backButtonClicked', handler);


//     return () => {
//       tg.offEvent('backButtonClicked', handler);
//     };
//   }, [location.pathname, navigate]);
// }
