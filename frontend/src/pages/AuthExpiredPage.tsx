import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';

export default function AuthExpiredPage() {
  const { t } = useTranslation('errors');
  const { webApp } = useTelegram();
  const { authError } = useAuth();

  const handleClose = () => {
    webApp?.MainButton.setText('Close');
    webApp?.MainButton.onClick(() => webApp.close());
    webApp?.MainButton.show();
    webApp?.close();
  };

  const getErrorMessage = () => {
    switch (authError) {
      case 'no-init-data':
        return t('no_auth_data');
      case 'auth-failed':
        return t('auth_failed');
      case 'network-error':
        return t('network_error');
      default:
        if (authError?.startsWith('HTTP')) {
          return t('server_error', { error: authError });
        }
        return t('session_expired_msg');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="text-xl font-semibold mb-3 text-tg-text">
        {authError === 'no-init-data' ? t('not_connected') : t('session_expired')}
      </h1>
      <p className="text-tg-hint text-[15px] mb-8">
        {getErrorMessage()}
      </p>
      <button
        onClick={handleClose}
        className="px-8 py-3 bg-tg-accent text-white rounded-xl text-[15px] font-medium active:opacity-80 transition-opacity"
      >
        {t('common:close')}
      </button>
      {authError && (
        <p className="text-tg-hint text-[11px] mt-4 opacity-50">
          {t('common:debug', { error: authError })}
        </p>
      )}
    </div>
  );
}
