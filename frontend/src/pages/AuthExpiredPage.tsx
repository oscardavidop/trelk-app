import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';

export default function AuthExpiredPage() {
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
        return 'No Telegram authentication data found. Please open the app from Telegram.';
      case 'auth-failed':
        return 'Authentication failed. Please try again.';
      case 'network-error':
        return 'Network error. Please check your connection.';
      default:
        if (authError?.startsWith('HTTP')) {
          return `Server error: ${authError}. Please try again later.`;
        }
        return 'Your session has expired. Please reopen the app from Telegram.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="text-xl font-semibold mb-3 text-tg-text">
        {authError === 'no-init-data' ? 'Not Connected' : 'Session Expired'}
      </h1>
      <p className="text-tg-hint text-[15px] mb-8">
        {getErrorMessage()}
      </p>
      <button
        onClick={handleClose}
        className="px-8 py-3 bg-tg-accent text-white rounded-xl text-[15px] font-medium active:opacity-80 transition-opacity"
      >
        Close
      </button>
      {authError && (
        <p className="text-tg-hint text-[11px] mt-4 opacity-50">
          Debug: {authError}
        </p>
      )}
    </div>
  );
}
