import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '../stores/subscription';
import { CheckCircle2, XCircle, Loader2, ExternalLink, ArrowLeft, Sparkles } from 'lucide-react';

const PENDING_SUB_KEY = 'trelk:pendingSubscription';

export default function PaypalReturnPage() {
  const { t } = useTranslation('subscription');
  const [params] = useSearchParams();
  const cancelled = params.get('cancelled') === 'true';
  const pendingSub = localStorage.getItem(PENDING_SUB_KEY);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [triedClose, setTriedClose] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

  const startPolling = useSubscriptionStore((s) => s.startPolling);
  const stopPolling = useSubscriptionStore((s) => s.stopPolling);
  const realStatus = useSubscriptionStore((s) => s.realStatus);

  // Start polling when page mounts (after PayPal approval)
  useEffect(() => {
    if (cancelled || !pendingSub) return;
    startPolling(pendingSub);
  }, [cancelled, pendingSub, startPolling]);

  // Auto-close attempt only AFTER subscription becomes ACTIVE
  useEffect(() => {
    if (cancelled) return;

    let attempts = 0;
    const pollTimeout = 60; // max 60 attempts (3 minutes)

    const checkReadyInterval = setInterval(() => {
      attempts++;
      if (realStatus === 'ACTIVE' || attempts >= pollTimeout) {
        setShowCountdown(true);
        clearInterval(checkReadyInterval);
      }
    }, 3000);

    return () => clearInterval(checkReadyInterval);
  }, [cancelled, realStatus]);

  // Countdown to close
  useEffect(() => {
    if (cancelled || !showCountdown) return;
    
    setSecondsLeft(3);

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setTriedClose(true);
          stopPolling();
          try { window.close(); } catch { /* ignored */ }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cancelled, showCountdown, stopPolling]);

  if (cancelled) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-inset"
        style={{ background: '#111316' }}
      >
        {/* Icon */}
        <div className="relative mb-7">
          <div
            className="w-[80px] h-[80px] rounded-[26px] flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.2)' }}
          >
            <XCircle className="w-10 h-10" style={{ color: '#ef4444' }} />
          </div>
        </div>

        <h1 className="text-[24px] font-bold text-white mb-2.5 text-center leading-tight">
          {t('paypal_return_cancelled_title', 'Payment Cancelled')}
        </h1>
        <p
          className="text-[14px] text-center leading-relaxed max-w-[280px] mb-10"
          style={{ color: '#7d8b97' }}
        >
          {t('paypal_return_cancelled_desc', 'No charges were made. You can return to Telegram and try again anytime.')}
        </p>

        <a
          href="tg://"
          className="w-full max-w-[320px] py-4 rounded-[18px] text-white font-bold text-[16px] text-center flex items-center justify-center gap-2.5 active:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #248BDA, #1a6fba)' }}
        >
          <ArrowLeft size={18} />
          {t('paypal_return_back_cta', 'Back to Telegram')}
        </a>

        <p
          className="text-[11px] text-center mt-5 max-w-[260px] leading-relaxed"
          style={{ color: '#4d5d6b' }}
        >
          {t('paypal_return_back_hint', "If the button doesn't work, open Telegram manually and return to the bot.")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-inset"
      style={{ background: '#111316' }}
    >
      {/* Animated success ring */}
      <div className="relative mb-7">
        <div
          className="w-[80px] h-[80px] rounded-[26px] flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.2)' }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: '#22c55e' }} />
        </div>
        <div
          className="absolute inset-0 rounded-[26px] border-2 animate-ping"
          style={{ borderColor: 'rgba(34,197,94,0.2)' }}
        />
      </div>

      <h1 className="text-[24px] font-bold text-white mb-2.5 text-center leading-tight">
        {t('paypal_return_received_title', 'Payment Received!')}
      </h1>

      {realStatus === 'ACTIVE' ? (
        <div className="flex items-center gap-2.5 mb-4">
          <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
          <span className="text-[14px] font-medium" style={{ color: '#22c55e' }}>
            {t('paypal_return_confirmed', 'Subscription confirmed!')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 mb-4">
          <Loader2 size={14} className="animate-spin" style={{ color: '#248BDA' }} />
          <span className="text-[14px] font-medium" style={{ color: '#5eaadf' }}>
            {t('paypal_return_activating', 'Activating your subscription…')}
          </span>
        </div>
      )}

      {/* Timeline steps */}
      <div
        className="w-full max-w-[320px] rounded-[20px] p-4 mb-7"
        style={{ background: 'rgba(36,139,218,0.06)', border: '1px solid rgba(36,139,218,0.12)' }}
      >
        <div className="flex flex-col gap-3.5">
          {[
            { done: true, label: t('paypal_return_step_1', 'Payment authorized by PayPal') },
            { done: true, label: t('paypal_return_step_2', 'Subscription record created') },
            { done: false, label: t('paypal_return_step_3', 'Features activated on your account'), loading: true },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: step.done
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(125,139,151,0.1)',
                  border: step.done
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid rgba(125,139,151,0.2)',
                }}
              >
                {step.loading ? (
                  <Loader2 size={10} className="animate-spin" style={{ color: '#248BDA' }} />
                ) : step.done ? (
                  <CheckCircle2 size={11} style={{ color: '#22c55e' }} />
                ) : null}
              </div>
              <span
                className="text-[13px] font-medium leading-tight"
                style={{ color: step.done ? '#e2e8f0' : '#7d8b97' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-close countdown - only show after activation confirmed */}
      {showCountdown && !triedClose ? (
        <div
          className="w-full max-w-[320px] rounded-[14px] px-4 py-3 mb-4 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[13px]" style={{ color: '#7d8b97' }}>
            {t('paypal_return_closing_in', 'Closing in')}{' '}
            <span className="text-white font-bold">{secondsLeft}s</span>
            …
          </p>
        </div>
      ) : showCountdown && triedClose ? (
        <div
          className="w-full max-w-[320px] rounded-[14px] px-4 py-3 mb-4 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[12px]" style={{ color: '#7d8b97' }}>
            {t('paypal_return_autoclose_failed', "Couldn't auto-close. Use the button below.")}
          </p>
        </div>
      ) : !realStatus || realStatus === 'FREE' ? (
        <div
          className="w-full max-w-[320px] rounded-[14px] px-4 py-3 mb-4 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[12px]" style={{ color: '#7d8b97' }}>
            {t('paypal_return_waiting', 'Waiting for payment confirmation…')}
          </p>
        </div>
      ) : null}

      <a
        href="tg://"
        className="w-full max-w-[320px] py-4 rounded-[18px] text-white font-bold text-[16px] text-center flex items-center justify-center gap-2.5 active:opacity-80 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #248BDA, #1a6fba)' }}
      >
        <Sparkles size={17} />
        {t('paypal_return_open_telegram', 'Open Telegram')}
        <ExternalLink size={15} className="opacity-70" />
      </a>

      <p
        className="text-[11px] text-center mt-4 max-w-[280px] leading-relaxed"
        style={{ color: '#4d5d6b' }}
      >
        {realStatus === 'ACTIVE'
          ? t('paypal_return_ready_desc', 'Your subscription is ready! Open Telegram to see your new premium features.')
          : t('paypal_return_pending_desc', 'Return to the bot — your subscription activates automatically within seconds.')}
      </p>
    </div>
  );
}
