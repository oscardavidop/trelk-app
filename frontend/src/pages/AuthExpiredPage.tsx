import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { Lock } from 'lucide-react';

export default function AuthExpiredPage() {
  const { t } = useTranslation('errors');
  const { webApp, haptic } = useTelegram();
  const { authError } = useAuth();

  const handleClose = () => {
    haptic?.impactOccurred('light');
    webApp?.MainButton.setText('Close');
    webApp?.MainButton.onClick(() => webApp.close());
    webApp?.MainButton.show();
    webApp?.close();
  };

  const getErrorMessage = () => {
    if (!authError) {
      console.warn('[AuthExpiredPage] Rendered without authError — likely a routing fallback. Path:', window.location.pathname);
      return t('session_expired_msg', 'Your session has expired. Please restart the app.');
    }
    console.error('[AuthExpiredPage] Authentication error:', authError);
    switch (authError) {
      case 'no-init-data':
        return t('no_auth_data', 'Authentication data is missing.');
      case 'auth-failed':
        return t('auth_failed', 'Authentication failed. Please try again.');
      case 'network-error':
        return t('network_error', 'Network error. Check your connection.');
      default:
        if (authError.startsWith('HTTP')) {
          return t('server_error', { error: authError, defaultValue: `Server error: ${authError}` });
        }
        return authError;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-tg-bg max-w-[480px] mx-auto animate-fade-in">
      
      {/* ── Contenedor del Ícono de Bloqueo ── */}
      <div className="w-[72px] h-[72px] rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-sm">
        <Lock size={32} className="text-red-500" strokeWidth={2.5} />
      </div>

      {/* ── Textos de Error ── */}
      <h1 className="text-[22px] font-bold text-tg-text tracking-tight mb-2.5">
        {authError === 'no-init-data' ? t('not_connected', 'Not Connected') : t('session_expired', 'Session Expired')}
      </h1>
      
      <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[260px] mx-auto mb-8">
        {getErrorMessage()}
      </p>

      {/* ── Botón de Acción ── */}
      <button
        onClick={handleClose}
        className="w-full max-w-[280px] py-3.5 rounded-[16px] bg-tg-accent text-white text-[15px] font-bold active:scale-[0.98] transition-transform duration-200 shadow-md"
      >
        {t('common:close', 'Close')}
      </button>

      {/* ── Debug / Info Técnica ── */}
      {authError && (
        <p className="text-tg-hint/50 text-[11px] font-mono mt-6 max-w-[80%] mx-auto truncate">
          {t('common:debug', { error: authError, defaultValue: `Error: ${authError}` })}
        </p>
      )}
      
    </div>
  );
}