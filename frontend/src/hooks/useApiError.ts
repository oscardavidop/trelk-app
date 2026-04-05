/**
 * React hook for handling API errors with i18n + toast integration.
 *
 * Usage:
 *   const { handleError } = useApiError();
 *   try { await api.post(...); } catch (err) { handleError(err); }
 *
 * Or in TanStack Query:
 *   useMutation({ mutationFn: ..., onError: handleError });
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, isApiError } from '../lib/api-error';
import { useToastStore } from '../stores';
import { setSessionToken } from '../lib/authFetch';

export function useApiError() {
  const { t } = useTranslation('errors');
  const showToast = useToastStore((s) => s.show);

  const handleError = useCallback(
    (err: unknown, retryFn?: () => void) => {
      // ── Auth errors → clear session ──
      if (isApiError(err) && err.isAuthError) {
        setSessionToken(null);
        showToast(
          t('session_expired_msg', 'Your session has expired. Please restart the app.'),
          'error',
          { duration: 5000 },
        );
        return;
      }

      // ── Rate limited → retryable ──
      if (isApiError(err) && err.isRateLimited) {
        const secs = err.retryAfter;
        const msg = secs
          ? t('rate_limited_seconds', { seconds: secs, defaultValue: `Too many requests. Try again in ${secs}s.` })
          : t('rate_limited', 'Too many requests. Please wait.');
        showToast(msg, 'error', { retryFn, duration: 4000 });
        return;
      }

      // ── Known API error with i18n key ──
      if (isApiError(err) && err.i18nKey) {
        const key = err.i18nKey.startsWith('errors.') ? err.i18nKey.slice(7) : err.i18nKey;
        const localized = t(key, { defaultValue: err.message });
        showToast(localized, 'error', {
          retryFn: err.retryable ? retryFn : undefined,
          duration: err.statusCode >= 500 ? 5000 : 3500,
        });
        return;
      }

      // ── Known API error without i18n key ──
      if (isApiError(err)) {
        showToast(err.message, 'error', {
          retryFn: err.retryable ? retryFn : undefined,
          duration: err.statusCode >= 500 ? 5000 : 3500,
        });
        return;
      }

      // ── Network errors ──
      if (err instanceof TypeError && err.message.includes('fetch')) {
        showToast(t('connection_lost', 'Connection lost. Check your internet.'), 'error', { retryFn, duration: 4000 });
        return;
      }

      // ── Unknown errors ──
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('critical_error', 'Something went wrong'), 'error', { retryFn, duration: 4000 });
    },
    [t, showToast],
  );

  return { handleError };
}
