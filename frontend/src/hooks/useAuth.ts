import { create } from 'zustand';
import { authenticate as apiAuth } from '../services/api';
import { useCallback } from 'react';
import { useUserStore } from '../stores';
import i18n from '../i18n';

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
    if (!initData) {
      console.warn('[Auth] No initData — not inside Telegram WebApp context');
      setAuthError('no-init-data');
      setLoading(false);
      return;
    }

    try {
      const res = await apiAuth(initData);
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
                isAdmin: meData.user.isAdmin === true,
                authTelegram: meData.user.telegram,
                authUser: meData.user.profile,
              });

              // Sync language from backend config if not already set locally
              const serverLang = meData.user.profile?.config?.locale?.lang;
              if (serverLang && serverLang !== i18n.language) {
                i18n.changeLanguage(serverLang);
              }
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
