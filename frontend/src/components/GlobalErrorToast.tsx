import { AlertTriangle, XCircle, X, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGlobalErrorStore } from '../stores/globalError';

export default function GlobalErrorToast() {
  const { message, severity, visible, retryFn, dismiss } = useGlobalErrorStore();
  const { t } = useTranslation('errors');
  console.log('GlobalErrorToast render', { message, severity, visible });

  if (!message) return null;

  if (severity === 'critical') {
    return (
      <div
        className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 transition-all duration-300 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className={`bg-tg-secondary rounded-[20px] border border-tg-border/50 p-6 w-full max-w-[320px] shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <XCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-[17px] font-extrabold text-tg-text mb-1.5">{t('critical_error')}</h2>
            <p className="text-[13px] text-tg-hint leading-relaxed mb-5">{message}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-[12px] bg-tg-text/[0.06] text-[14px] font-semibold text-tg-text active:scale-95 transition-transform"
              >
                {t('dismiss')}
              </button>
              {retryFn && (
                <button
                  onClick={() => { retryFn(); dismiss(); }}
                  className="flex-1 py-2.5 rounded-[12px] bg-tg-accent text-[14px] font-semibold text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <RotateCcw size={14} />
                  {t('retry')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-12 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 max-w-sm w-max pointer-events-auto
          bg-amber-500/90 backdrop-blur-xl rounded-[14px] shadow-xl border border-amber-400/30
          transition-all duration-300 ease-out
          ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}
      >
        <AlertTriangle size={16} className="text-white shrink-0" />
        <span className="text-[13px] font-semibold text-white leading-snug flex-1">{message}</span>
        <button onClick={dismiss} className="shrink-0 active:scale-90 transition-transform">
          <X size={14} className="text-white/70" />
        </button>
      </div>
    </div>
  );
}
