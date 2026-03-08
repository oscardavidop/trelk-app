import { useMemo } from 'react';

export function useTelegram() {
  const webApp = useMemo(() => {
    return window.Telegram?.WebApp ?? null;
  }, []);

  const user = useMemo(() => {
    return webApp?.initDataUnsafe?.user ?? null;
  }, [webApp]);

  const initData = useMemo(() => {
    return webApp?.initData ?? '';
  }, [webApp]);

  const haptic = useMemo(() => {
    return webApp?.HapticFeedback ?? null;
  }, [webApp]);

  return { webApp, user, initData, haptic };
}
