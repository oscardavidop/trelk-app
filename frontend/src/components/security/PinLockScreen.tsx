import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Delete, AlertTriangle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { verifyPin, fetchMyQuestions, verifyRecoveryAnswers, resetPinAfterRecovery } from '../../services/securityApi';
import { useSecurityStore } from '../../stores/security';

const PIN_LENGTH = 4;

const QUESTION_IDS = [
  'pet_name', 'birth_city', 'favorite_food',
  'first_school', 'mother_name', 'favorite_movie',
] as const;

type Screen = 'pin' | 'recovery' | 'new-pin' | 'success';

export default function PinLockScreen() {
  const { t } = useTranslation('security');
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const setVerified = useSecurityStore((s) => s.setVerified);
  const isLocked = useSecurityStore((s) => s.isLocked);

  // Recovery state
  const [myQuestionIds, setMyQuestionIds] = useState<string[]>([]);
  const [recoveryAnswers, setRecoveryAnswers] = useState<Record<string, string>>({});
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [hasQuestions, setHasQuestions] = useState<boolean | null>(null);

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'error') => {
    try {
      const wa = window.Telegram?.WebApp;
      if (type === 'error') wa?.HapticFeedback?.notificationOccurred('error');
      else wa?.HapticFeedback?.impactOccurred(type);
    } catch { /* no haptic */ }
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (loading || isLocked) return;
    haptic('light');
    setError('');
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      return prev + digit;
    });
  }, [loading, isLocked, haptic]);

  const handleDelete = useCallback(() => {
    haptic('light');
    setPin((prev) => prev.slice(0, -1));
  }, [haptic]);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length < PIN_LENGTH) return;
    if (screen === 'new-pin') {
      // Recovery: set new PIN
      (async () => {
        setLoading(true);
        try {
          await resetPinAfterRecovery(pin);
          haptic('medium');
          setScreen('success');
          setTimeout(() => setVerified(true), 1200);
        } catch {
          haptic('error');
          setShake(true);
          setError(t('verify_error'));
          setTimeout(() => { setShake(false); setPin(''); }, 400);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    // Normal PIN verification
    (async () => {
      setLoading(true);
      try {
        const res = await verifyPin(pin);
        if (res.success) {
          haptic('medium');
          setVerified(true);
        } else {
          haptic('error');
          setShake(true);
          setError(t('wrong_pin'));
          if (res.attemptsLeft !== undefined) setAttemptsLeft(res.attemptsLeft);
          setTimeout(() => { setShake(false); setPin(''); }, 400);
        }
      } catch {
        haptic('error');
        setShake(true);
        setError(t('verify_error'));
        setTimeout(() => { setShake(false); setPin(''); }, 400);
      } finally {
        setLoading(false);
      }
    })();
  }, [pin, screen, haptic, setVerified, t]);

  // Start recovery flow
  const startRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const res = await fetchMyQuestions();
      if (res.questionIds && res.questionIds.length > 0) {
        setMyQuestionIds(res.questionIds);
        setHasQuestions(true);
        setRecoveryAnswers({});
        setScreen('recovery');
      } else {
        setHasQuestions(false);
        setScreen('recovery');
      }
    } catch {
      setRecoveryError(t('verify_error'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Submit recovery answers
  const submitRecovery = async () => {
    const answers = myQuestionIds.map((qid) => ({
      questionId: qid,
      answer: recoveryAnswers[qid]?.trim() || '',
    }));
    if (answers.some((a) => !a.answer)) {
      setRecoveryError(t('answer_all_questions'));
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const res = await verifyRecoveryAnswers(answers);
      if (res.success) {
        haptic('medium');
        setPin('');
        setScreen('new-pin');
      } else {
        haptic('error');
        setRecoveryError(t('recovery_wrong_answers'));
        if (res.attemptsLeft !== undefined) {
          setRecoveryError(`${t('recovery_wrong_answers')} (${res.attemptsLeft} ${t('attempts_left')})`);
        }
      }
    } catch (e: any) {
      haptic('error');
      const msg = e?.message || '';
      if (msg.includes('RECOVERY_LOCKED')) setRecoveryError(t('error_RECOVERY_LOCKED'));
      else setRecoveryError(t('verify_error'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  // ── Success screen ──
  if (screen === 'success') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-tg-bg">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
        </motion.div>
        <h1 className="text-lg font-bold text-tg-text">{t('pin_changed')}</h1>
      </div>
    );
  }

  // ── Recovery screen ──
  if (screen === 'recovery') {
    if (hasQuestions === false) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-tg-bg px-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold text-tg-text mb-2 text-center">{t('recovery_no_questions')}</h1>
          <p className="text-sm text-tg-hint text-center mb-6">{t('recovery_no_questions_desc')}</p>
          <button
            onClick={() => { setScreen('pin'); setPin(''); setError(''); }}
            className="px-6 py-2.5 rounded-xl bg-tg-accent text-white text-sm font-semibold"
          >
            {t('back')}
          </button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-tg-bg overflow-y-auto" style={{
        top: 'var(--tg-top-offset, var(--tg-top-offset, env(--tg-top2-offset, 6px)))'
      }}>
        <div className="px-5 pt-4 pb-4 flex items-center gap-3">
          <button
            onClick={() => { setScreen('pin'); setPin(''); setError(''); }}
            className="w-9 h-9 rounded-full bg-tg-text/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-text" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-tg-text">{t('recovery_title')}</h1>
            <p className="text-xs text-tg-hint">{t('recovery_desc')}</p>
          </div>
        </div>

        <div className="px-5 space-y-4 flex-1">
          {myQuestionIds.map((qid) => (
            <div key={qid} className="space-y-1.5">
              <label className="text-[13px] font-semibold text-tg-text">
                {t(`question_${qid}`)}
              </label>
              <input
                type="text"
                value={recoveryAnswers[qid] || ''}
                onChange={(e) => setRecoveryAnswers((prev) => ({ ...prev, [qid]: e.target.value }))}
                placeholder={t('recovery_answer_placeholder')}
                className="w-full px-3.5 py-3 rounded-xl bg-tg-bg/60 border border-tg-border/70 text-[14px] text-tg-text placeholder:text-tg-hint/40 focus:outline-none focus:border-tg-accent focus:border-2 focus:ring-1 focus:ring-tg-accent/20 transition-colors"
                autoComplete="off"
              />
            </div>
          ))}

          {recoveryError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {recoveryError}
            </p>
          )}
        </div>

        <div className="px-5 py-4" style={{
          top: 'var(--tg-top-offset, var(--tg-top-offset, env(--tg-top2-offset, 6px)))'
        }}>
          <button
            onClick={submitRecovery}
            disabled={recoveryLoading || myQuestionIds.some((qid) => !recoveryAnswers[qid]?.trim())}
            className="w-full py-3.5 rounded-2xl bg-tg-accent text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {recoveryLoading ? (
              <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : t('verify_answers')}
          </button>
        </div>
      </div>
    );
  }

  // ── PIN entry + new-pin screen ──
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-tg-bg">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="mb-6"
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${screen === 'new-pin' ? 'bg-emerald-500/10' : 'bg-tg-accent/10'}`}>
          {screen === 'new-pin' ? (
            <KeyRound className="w-8 h-8 text-emerald-500" />
          ) : (
            <Shield className="w-8 h-8 text-tg-accent" />
          )}
        </div>
      </motion.div>

      {/* Title */}
      <h1 className="text-lg font-bold text-tg-text mb-1">
        {screen === 'new-pin' ? t('set_new_pin') : t('enter_pin')}
      </h1>
      <p className="text-sm text-tg-hint mb-8">
        {screen === 'new-pin' ? t('recovery_success') : t('enter_pin_subtitle')}
      </p>

      {/* PIN dots */}
      <motion.div
        className="flex gap-4 mb-8"
        animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${i < pin.length
              ? (screen === 'new-pin' ? 'bg-emerald-500 scale-110' : 'bg-tg-accent scale-110')
              : 'bg-tg-text/10'
              }`}
            animate={i < pin.length ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.15 }}
          />
        ))}
      </motion.div>

      {/* Error / locked */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-500 mb-2 flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {error}
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <span className="text-tg-hint ml-1">({attemptsLeft} {t('attempts_left')})</span>
            )}
          </motion.p>
        )}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-red-500 mb-4"
          >
            <Lock className="w-3 h-3" /> {t('account_locked')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="h-14 rounded-2xl flex items-center justify-center text-tg-hint active:bg-tg-text/5 transition-colors"
              >
                <Delete className="w-6 h-6" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={loading || isLocked}
              className="h-14 rounded-2xl bg-tg-text/[0.04] text-xl font-semibold text-tg-text active:bg-tg-accent/20 active:text-tg-accent transition-colors disabled:opacity-40"
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-6">
          <div className="w-5 h-5 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Forgot PIN — only on main pin entry screen */}
      {screen === 'pin' && !loading && (
        <button
          onClick={() => { haptic('light'); startRecovery(); }}
          disabled={recoveryLoading}
          className="mt-6 text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity"
        >
          {recoveryLoading ? (
            <div className="w-4 h-4 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
          ) : t('forgot_pin')}
        </button>
      )}
    </div>
  );
}
