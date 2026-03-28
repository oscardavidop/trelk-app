/**
 * NavigationManager — prevents duplicate pushes and provides safe back navigation.
 * Works with React Router's NavigateFunction.
 */

let _lastRoute = '';
let _lastPushTime = 0;
const DEBOUNCE_MS = 300;

type NavigateFn = (to: string | number, opts?: { replace?: boolean; state?: any }) => void;

export function createNavigationManager(navigate: NavigateFn) {
  return {
    /**
     * Safe push: ignores duplicate consecutive pushes within DEBOUNCE_MS.
     */
    push(route: string, state?: Record<string, unknown>) {
      const now = Date.now();
      if (route === _lastRoute && now - _lastPushTime < DEBOUNCE_MS) return;
      _lastRoute = route;
      _lastPushTime = now;
      navigate(route, { state });
    },

    /**
     * Replace current route without pushing to history stack.
     */
    replace(route: string, state?: Record<string, unknown>) {
      _lastRoute = route;
      _lastPushTime = Date.now();
      navigate(route, { replace: true, state });
    },

    /**
     * Smart back: uses location.state.from if available, else navigate(-1).
     * Prevents double-back by debouncing.
     */
    safeBack(from?: string, fallback?: string) {
      const now = Date.now();
      if (now - _lastPushTime < DEBOUNCE_MS) return;
      _lastPushTime = now;

      if (from) {
        navigate(from, { replace: true });
      } else if (fallback) {
        navigate(fallback, { replace: true });
      } else {
        navigate(-1 as any);
      }
    },
  };
}
