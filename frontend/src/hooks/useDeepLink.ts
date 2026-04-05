import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores';
import { authFetch } from '../lib/authFetch';

/**
 * Handles Telegram deep links (start_param from t.me/bot?start=payload).
 * Resolves the start param via backend and navigates accordingly.
 */
export function useDeepLink() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !user?.id) return;

    const webApp = window.Telegram?.WebApp;
    const startParam = webApp?.initDataUnsafe?.start_param;
    if (!startParam) return;

    handled.current = true;

    // Resolve deep link via backend
    authFetch(`/api/v1/ui/deep-link/resolve?start=${encodeURIComponent(startParam)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.route) {
          navigate(data.route, { replace: true });
        }
      })
      .catch((err) => {
        console.warn('[DeepLink] Failed to resolve:', err);
      });
  }, [user?.id, navigate]);
}
