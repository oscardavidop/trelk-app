import { create } from 'zustand';
import { authenticate as apiAuth } from '../services/api';
import { useCallback } from 'react';
import { useUserStore } from '../stores';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setAuthError: (error: string | null) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),
  setAuthError: (error) => set({ authError: error }),
}));

export function useAuth() {
  const { isAuthenticated, isLoading, authError, setAuthenticated, setLoading, setAuthError } = useAuthStore();
  const setUser = useUserStore((s) => s.setUser);

  const authenticate = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData;

    console.log('[Auth] Telegram WebApp available:', !!tg);
    console.log('[Auth] initData present:', !!initData, 'length:', initData?.length ?? 0);
    console.log('[Auth] platform:', tg?.platform, 'version:', tg?.version);

    if (!initData) {
      console.warn('[Auth] No initData — not inside Telegram WebApp context');
      setAuthError('no-init-data');
      setLoading(false);
      return;
    }

    try {
      console.log('[Auth] Sending auth request...');
      const res = await apiAuth(initData);
      console.log('[Auth] Auth response:', JSON.stringify(res));

      if (res.ok) {
        setAuthError(null);

        // Fetch user profile ANTES de marcar isAuthenticated
        // (TrelkEntry necesita user.id para redirigir correctamente)
        try {
          const meRes = await fetch('/api/v1/ui/me', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.ok && meData.user) {
              setUser({
                id: meData.user.id,
                authTelegram: meData.user.telegram,
                authUser: meData.user.profile,
              });
              console.log('[Auth] User profile loaded, id:', meData.user.id);
            }
          } else {
            console.warn('[Auth] /api/v1/ui/me returned:', meRes.status);
          }
        } catch (e) {
          console.warn('[Auth] Failed to fetch user profile:', e);
        }

        // Marcar autenticado DESPUÉS de cargar el perfil
        setAuthenticated(true);
      } else {
        console.error('[Auth] Auth returned ok:false', res);
        setAuthError(res.error || 'auth-failed');
      }
    } catch (err) {
      console.error('[Auth] Auth request failed:', err);
      setAuthError(err instanceof Error ? err.message : 'network-error');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [setAuthenticated, setLoading, setAuthError, setUser]);

  return { isAuthenticated, isLoading, authError, authenticate };
}
