import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook para manejar el botón "Back" de Telegram WebApp.
 * Muestra el BackButton cuando NO estamos en la página raíz del usuario.
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
      const handler = () => navigate(-1);
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
      };
    }
  }, [location.pathname, navigate]);
}
