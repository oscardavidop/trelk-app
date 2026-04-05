import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldOff, ShieldAlert, Lock, Clock,
  ChevronRight, Fingerprint, HelpCircle, KeyRound, CheckCircle2,
  ChevronDown, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '../hooks/useTelegram';
import { useSecurityStore } from '../stores/security';
import {
  fetchPinStatus, setPin, disablePin, updatePinSettings,
  fetchMyQuestions, setSecurityQuestions, verifyRecoveryAnswers,
  resetPinAfterRecovery, verifyPin,
} from '../services/securityApi';
import StickyHeader from '@/components/StickyHeader';
import { useLocation, useNavigate } from 'react-router-dom';

// ── Constants ──
const QUESTION_IDS = [
  'pet_name', 'birth_city', 'favorite_food',
  'first_school', 'mother_name', 'favorite_movie',
] as const;

type Screen =
  | 'idle'
  | 'pin-entry'
  | 'questions-setup'
  | 'recovery-questions'
  | 'recovery-new-pin'
  | 'success';

type PinMode = 'set' | 'change' | 'disable';

// ── Numpad Component ──
function Numpad({
  onDigit,
  onDelete,
  onCancel,
  disabled,
  cancelLabel,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  disabled: boolean;
  cancelLabel: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-[286px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <motion.button
          key={n}
          whileTap={{ scale: 0.88 }}
          onClick={() => onDigit(String(n))}
          disabled={disabled}
          className="h-[66px] rounded-2xl bg-tg-secondary/80 backdrop-blur-sm border border-tg-border/15 text-[21px] font-semibold text-tg-text active:bg-tg-accent/10 transition-all disabled:opacity-40"
        >
          {n}
        </motion.button>
      ))}
      <button
        onClick={onCancel}
        className="h-[66px] rounded-2xl text-[12px] font-semibold text-tg-hint/70 active:bg-tg-hint/10 transition-colors"
      >
        {cancelLabel}
      </button>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => onDigit('0')}
        disabled={disabled}
        className="h-[66px] rounded-2xl bg-tg-secondary/80 backdrop-blur-sm border border-tg-border/15 text-[21px] font-semibold text-tg-text active:bg-tg-accent/10 transition-all disabled:opacity-40"
      >
        0
      </motion.button>
      <button
        onClick={onDelete}
        className="h-[66px] rounded-2xl text-[15px] font-semibold text-tg-hint/70 active:bg-tg-hint/10 transition-colors"
      >
        ⌫
      </button>
    </div>
  );
}

// ── PinDots Component ──
function PinDots({ filled, error, shake }: { filled: number; error: boolean; shake: boolean }) {
  return (
    <motion.div
      animate={shake ? { x: [0, -14, 14, -10, 10, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex gap-5 my-7"
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: i === filled - 1 && filled > 0 ? [1, 1.4, 1.15] : i < filled ? 1.15 : 1,
            backgroundColor:
              error && i < filled
                ? '#ef4444'
                : i < filled
                  ? 'var(--tg-accent, #007aff)'
                  : 'transparent',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className={`w-[18px] h-[18px] rounded-full border-[2.5px] ${error ? 'border-red-400/60' : 'border-tg-hint/25'
            }`}
        />
      ))}
    </motion.div>
  );
}

// ── SecurityLevelBadge Component ──
function SecurityLevelBadge({
  pinEnabled,
  hasQuestions,
  t,
}: {
  pinEnabled: boolean;
  hasQuestions: boolean;
  t: (k: string) => string;
}) {
  const level = pinEnabled && hasQuestions ? 'high' : pinEnabled ? 'medium' : 'low';
  const colors = {
    high: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    low: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  const icons = {
    high: <ShieldCheck size={14} />,
    medium: <ShieldAlert size={14} />,
    low: <ShieldOff size={14} />,
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${colors[level]}`}>
      {icons[level]}
      {t(`security_level_${level}`)}
    </div>
  );
}

// ── QuestionSelector Component ──
function QuestionSelector({
  index,
  selectedId,
  answer,
  usedIds,
  onSelectId,
  onChangeAnswer,
  t,
}: {
  index: number;
  selectedId: string;
  answer: string;
  usedIds: Set<string>;
  onSelectId: (id: string) => void;
  onChangeAnswer: (val: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);
  const available = QUESTION_IDS.filter((id) => id === selectedId || !usedIds.has(id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl bg-tg-secondary/60 backdrop-blur-sm border border-tg-border/20 p-4 space-y-3"
    >
      <div className="text-[12px] font-bold text-tg-accent/80 uppercase tracking-wider">
        {t('question_number', { n: index + 1 })}
      </div>

      {/* Question dropdown */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-tg-bg/60 border border-tg-border/15 text-left transition-colors active:bg-tg-hint/10"
      >
        <span className={`text-[14px] ${selectedId ? 'text-tg-text font-medium' : 'text-tg-hint/60'}`}>
          {selectedId ? t(`question_${selectedId}`) : t('select_question')}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-tg-hint/50" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-tg-bg/80 border border-tg-border/15 divide-y divide-tg-border/10 overflow-hidden">
              {available.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    onSelectId(id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors ${id === selectedId
                      ? 'bg-tg-accent/10 text-tg-accent font-semibold'
                      : 'text-tg-text active:bg-tg-hint/10'
                    }`}
                >
                  {t(`question_${id}`)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer input */}
      <input
        type="text"
        value={answer}
        onChange={(e) => onChangeAnswer(e.target.value)}
        placeholder={t('your_answer')}
        className="w-full px-3.5 py-3 rounded-xl bg-tg-bg/60 border border-transparent text-[14px] text-tg-text placeholder:text-tg-hint/40 focus:outline-none focus:border-tg-accent focus:border-2 transition-colors"
        autoComplete="off"
      />
    </motion.div>
  );
}

// ── Main Component ──
export default function PinSettingsPage() {
  const { t } = useTranslation('security');
  const { haptic } = useTelegram();
  const queryClient = useQueryClient();
  const { setPinEnabled, setVerified } = useSecurityStore();
  const location = useLocation();
  const navigate = useNavigate();
  

  // ── Screen state derived from hash ──
  const hashToScreen = (hash: string): Screen => {
    const h = hash.replace('#', '') as Screen;
    const valid: Screen[] = ['pin-entry', 'questions-setup', 'recovery-questions', 'recovery-new-pin'];
    return valid.includes(h) ? h : 'idle';
  };
  const screen = hashToScreen(location.hash);
  const [pinMode, setPinMode] = useState<PinMode>('set');

  /** Pending action after PIN verification gate */
  const pendingAfterVerify = useRef<(() => void) | null>(null);

  /** Navigate to a screen by pushing/replacing hash via React Router */
  const setScreen = useCallback((s: Screen) => {
    if (s === 'idle') {
      if (location.hash) navigate(location.pathname, { replace: true });
    } else {
      // If already on a sub-screen (hash exists), replace to keep history flat
      // If coming from idle (no hash), push so back returns to idle
      navigate(location.pathname + `#${s}`, { replace: !!location.hash });
    }
  }, [navigate, location.pathname, location.hash]);

  // ── PIN entry state ──
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Questions state ──
  const [questions, setQuestions] = useState<{ questionId: string; answer: string }[]>([
    { questionId: '', answer: '' },
    { questionId: '', answer: '' },
    { questionId: '', answer: '' },
  ]);

  // ── Recovery state ──
  const [recoveryAnswers, setRecoveryAnswers] = useState<{ questionId: string; answer: string }[]>([]);
  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'new' | 'confirm'>('new');

  // ── Success state ──
  const [successMessage, setSuccessMessage] = useState('');
  const [successScreenActive, setSuccessScreenActive] = useState(false);
  const [goToQuestionsAfterPin, setGoToQuestionsAfterPin] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    shakeTimeout.current = setTimeout(() => setShake(false), 500);
  }, []);

  // ── Data queries ──
  const { data: status, isLoading } = useQuery({
    queryKey: ['pin-status'],
    queryFn: fetchPinStatus,
    staleTime: 30_000,
  });

  const { data: myQuestions } = useQuery({
    queryKey: ['my-questions'],
    queryFn: fetchMyQuestions,
    staleTime: 60_000,
    enabled: !!status?.pinEnabled,
  });

  const pinEnabled = status?.pinEnabled ?? false;
  const hasQuestions = status?.hasSecurityQuestions ?? false;
  const lockMinutes = status?.lockAfterMinutes ?? 5;
  const myQuestionIds = myQuestions?.questionIds ?? [];

  const usedQuestionIds = useMemo(
    () => new Set(questions.map((q) => q.questionId).filter(Boolean)),
    [questions],
  );

  // ── Resets ──
  const resetAll = useCallback(() => {
    setStep('new');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setQuestions([
      { questionId: '', answer: '' },
      { questionId: '', answer: '' },
      { questionId: '', answer: '' },
    ]);
    setRecoveryAnswers([]);
    setRecoveryPin('');
    setRecoveryConfirm('');
    setRecoveryStep('new');
    setGoToQuestionsAfterPin(false);
    pendingAfterVerify.current = null;
    // Navigate back: if we have a hash, go back to clean it
    if (window.location.hash) {
      navigate(-1);
    }
  }, [navigate]);

  // ── Mutations ──
  const setPinMutation = useMutation({
    mutationFn: (data: { pin: string; currentPin?: string }) => setPin(data.pin, data.currentPin),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      setPinEnabled(true);
      queryClient.invalidateQueries({ queryKey: ['pin-status'] });
      if (goToQuestionsAfterPin && !hasQuestions) {
        setScreen('questions-setup');
        setError('');
      } else {
        showSuccess(t('pin_enabled'));
      }
    },
    onError: (e: Error) => {
      haptic?.notificationOccurred('error');
      setError(t(`error_${e.message}`, e.message));
      triggerShake();
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setStep(pinMode === 'change' ? 'current' : 'new');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (pin: string) => disablePin(pin),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      setPinEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['pin-status'] });
      showSuccess(t('pin_disabled'));
    },
    onError: (e: Error) => {
      haptic?.notificationOccurred('error');
      setError(t(`error_${e.message}`, e.message));
      triggerShake();
      setCurrentPin('');
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (mins: number) => updatePinSettings(mins),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      queryClient.invalidateQueries({ queryKey: ['pin-status'] });
    },
  });

  const questionsMutation = useMutation({
    mutationFn: (qs: { questionId: string; answer: string }[]) => setSecurityQuestions(qs),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      queryClient.invalidateQueries({ queryKey: ['pin-status'] });
      queryClient.invalidateQueries({ queryKey: ['my-questions'] });
      showSuccess(t('questions_saved'));
    },
    onError: (e: Error) => {
      haptic?.notificationOccurred('error');
      setError(t(`error_${e.message}`, e.message));
    },
  });

  const recoveryVerifyMutation = useMutation({
    mutationFn: (answers: { questionId: string; answer: string }[]) => verifyRecoveryAnswers(answers),
    onSuccess: (data) => {
      if (data.success) {
        haptic?.notificationOccurred('success');
        setScreen('recovery-new-pin');
        setError('');
      } else {
        haptic?.notificationOccurred('error');
        setError(
          data.attemptsLeft !== undefined
            ? `${t('error_PIN_INCORRECT')} — ${data.attemptsLeft} ${t('attempts_left')}`
            : t('error_PIN_INCORRECT'),
        );
      }
    },
    onError: (e: Error) => {
      haptic?.notificationOccurred('error');
      setError(t(`error_${e.message}`, e.message));
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: (pin: string) => resetPinAfterRecovery(pin),
    onSuccess: () => {
      haptic?.notificationOccurred('success');
      setPinEnabled(true);
      queryClient.invalidateQueries({ queryKey: ['pin-status'] });
      showSuccess(t('pin_reset_success'));
    },
    onError: (e: Error) => {
      haptic?.notificationOccurred('error');
      setError(t(`error_${e.message}`, e.message));
      triggerShake();
      setRecoveryPin('');
      setRecoveryConfirm('');
      setRecoveryStep('new');
    },
  });

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    // Show success in-place without changing hash (screen stays from hash)
    setSuccessScreenActive(true);
    setTimeout(() => {
      setSuccessScreenActive(false);
      // reset state
      setStep('new');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
      setQuestions([
        { questionId: '', answer: '' },
        { questionId: '', answer: '' },
        { questionId: '', answer: '' },
      ]);
      setRecoveryAnswers([]);
      setRecoveryPin('');
      setRecoveryConfirm('');
      setRecoveryStep('new');
      setGoToQuestionsAfterPin(false);
      pendingAfterVerify.current = null;
      // Navigate back to idle (clean hash)
      if (window.location.hash) navigate(-1);
    }, 1800);
  }, [navigate]);

  /** Shared handler for verify result (wrong PIN feedback) */
  const handleVerifyFail = (data: { success: boolean; attemptsLeft?: number }) => {
    haptic?.notificationOccurred('error');
    setError(
      data.attemptsLeft !== undefined
        ? `${t('error_PIN_INCORRECT')} — ${data.attemptsLeft} ${t('attempts_left')}`
        : t('error_PIN_INCORRECT'),
    );
    triggerShake();
    setCurrentPin('');
  };

  const handleVerifyError = (e: Error) => {
    haptic?.notificationOccurred('error');
    setError(t(`error_${e.message}`, e.message));
    triggerShake();
    setCurrentPin('');
  };

  // ── PIN entry handler ──
  const handleDigit = (d: string) => {
    haptic?.impactOccurred('light');
    setError('');

    if (step === 'current') {
      const next = currentPin + d;
      setCurrentPin(next);
      if (next.length === 4) {
        if (pinMode === 'disable') {
          disableMutation.mutate(next);
        } else {
          // Validate old PIN immediately via API
          verifyMutation.mutate(next, {
            onSuccess: (data) => {
              if (data.success) {
                haptic?.notificationOccurred('success');
                queryClient.invalidateQueries({ queryKey: ['pin-status'] });
                // Check if there's a pending action (questions gate)
                const action = pendingAfterVerify.current;
                if (action) {
                  pendingAfterVerify.current = null;
                  action();
                } else {
                  setStep('new');
                }
              } else {
                handleVerifyFail(data);
              }
            },
            onError: handleVerifyError,
          });
        }
      }
    } else if (step === 'new') {
      const next = newPin + d;
      setNewPin(next);
      if (next.length === 4) setStep('confirm');
    } else {
      const next = confirmPin + d;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next !== newPin) {
          haptic?.notificationOccurred('error');
          setError(t('pins_no_match'));
          triggerShake();
          setConfirmPin('');
          setStep('new');
          setNewPin('');
        } else {
          setPinMutation.mutate({ pin: next, currentPin: currentPin || undefined });
        }
      }
    }
  };

  const handleDelete = () => {
    haptic?.impactOccurred('light');
    if (step === 'current') setCurrentPin((p) => p.slice(0, -1));
    else if (step === 'new') setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  // ── Recovery PIN handler ──
  const handleRecoveryDigit = (d: string) => {
    haptic?.impactOccurred('light');
    setError('');

    if (recoveryStep === 'new') {
      const next = recoveryPin + d;
      setRecoveryPin(next);
      if (next.length === 4) setRecoveryStep('confirm');
    } else {
      const next = recoveryConfirm + d;
      setRecoveryConfirm(next);
      if (next.length === 4) {
        if (next !== recoveryPin) {
          haptic?.notificationOccurred('error');
          setError(t('pins_no_match'));
          triggerShake();
          setRecoveryConfirm('');
          setRecoveryStep('new');
          setRecoveryPin('');
        } else {
          resetPinMutation.mutate(next);
        }
      }
    }
  };

  const handleRecoveryDelete = () => {
    haptic?.impactOccurred('light');
    if (recoveryStep === 'new') setRecoveryPin((p) => p.slice(0, -1));
    else setRecoveryConfirm((p) => p.slice(0, -1));
  };

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const activeRecoveryPin = recoveryStep === 'new' ? recoveryPin : recoveryConfirm;
  // ── Verify PIN mutation (standalone, no default callbacks) ──
  const verifyMutation = useMutation({
    mutationFn: (pin: string) => verifyPin(pin),
  });

  const isSubmitting =
    setPinMutation.isPending || disableMutation.isPending ||
    questionsMutation.isPending || recoveryVerifyMutation.isPending ||
    resetPinMutation.isPending || verifyMutation.isPending;

  // ── Start flows ──
  const startPinEntry = (mode: PinMode) => {
    haptic?.impactOccurred('medium');
    setPinMode(mode);
    setScreen('pin-entry');
    setError('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    if (pinEnabled && (mode === 'change' || mode === 'disable')) {
      setStep('current');
    } else {
      setStep('new');
      if (mode === 'set') setGoToQuestionsAfterPin(true);
    }
  };

  /** Open PIN gate, then run `afterVerify` once confirmed */
  const requirePinThen = (afterVerify: () => void) => {
    haptic?.impactOccurred('medium');
    pendingAfterVerify.current = afterVerify;
    setPinMode('change'); // reuse mode for visual
    setScreen('pin-entry');
    setStep('current');
    setError('');
    setCurrentPin('');
  };

  const startQuestionsSetup = () => {
    const doOpen = () => {
      haptic?.impactOccurred('medium');
      if (myQuestionIds.length === 3) {
        setQuestions(myQuestionIds.map((id) => ({ questionId: id, answer: '' })));
      }
      setScreen('questions-setup');
      setError('');
    };
    // If PIN is enabled, require verification first
    if (pinEnabled) {
      requirePinThen(doOpen);
    } else {
      doOpen();
    }
  };

  const startDisablePin = () => {
    startPinEntry('disable');
  };

  const startRecovery = () => {
    haptic?.impactOccurred('medium');
    if (!hasQuestions) return;
    setRecoveryAnswers(myQuestionIds.map((id) => ({ questionId: id, answer: '' })));
    setScreen('recovery-questions');
    setError('');
  };

  const handleSaveQuestions = () => {
    const invalid = questions.some((q) => !q.questionId || q.answer.trim().length < 2);
    if (invalid) {
      setError(t('error_ANSWER_TOO_SHORT'));
      return;
    }
    questionsMutation.mutate(questions);
  };

  const handleVerifyRecovery = () => {
    const invalid = recoveryAnswers.some((a) => a.answer.trim().length < 2);
    if (invalid) {
      setError(t('error_ANSWER_TOO_SHORT'));
      return;
    }
    recoveryVerifyMutation.mutate(recoveryAnswers);
  };

  const lockOptions = [1, 5, 15, 30, 60];
  const stepIndex = step === 'current' ? 0 : step === 'new' ? 1 : 2;
  const totalSteps = pinMode === 'disable' ? 1 : pinMode === 'change' ? 3 : 2;

  const stepSubtitle: Record<string, string> = {
    current: t('enter_pin_to_disable'),
    new: t('enter_4_digits'),
    confirm: t('reenter_pin'),
  };

  return (
    <div className="pb-24 animate-fade-in">

      {
        screen === 'idle' && (
          <StickyHeader title={t('pin_settings')} subtitle={t('pin_settings_subtitle')} />

        )
      }

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="px-5 mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-tg-text/[0.03] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : successScreenActive ? (
        /* ── Success Screen ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center mt-20 px-5"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mb-5"
          >
            <CheckCircle2 size={40} className="text-emerald-500" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-[17px] font-bold text-tg-text text-center"
          >
            {successMessage}
          </motion.p>
        </motion.div>
      ) : screen === 'idle' ? (
        /* ── Idle: Dashboard ── */
        <div className="px-5 mt-4 space-y-5">
          {/* Security Level + Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-sm border border-tg-border/20 p-5"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-[52px] h-[52px] rounded-[18px] flex items-center justify-center ${pinEnabled
                    ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20'
                    : 'bg-tg-hint/8 border border-tg-border/25'
                  }`}
              >
                {pinEnabled ? (
                  <ShieldCheck size={24} className="text-emerald-500" />
                ) : (
                  <Shield size={24} className="text-tg-hint/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold text-tg-text">
                    {pinEnabled ? t('pin_enabled') : t('pin_disabled')}
                  </span>
                  <SecurityLevelBadge pinEnabled={pinEnabled} hasQuestions={hasQuestions} t={t} />
                </div>
                <p className="text-[13px] text-tg-hint leading-snug">
                  {pinEnabled
                    ? hasQuestions
                      ? t('security_level_high_desc')
                      : t('security_level_medium_desc')
                    : t('pin_inactive_desc')}
                </p>
              </div>
            </div>

            {/* Recovery reminder */}
            {pinEnabled && !hasQuestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/15"
              >
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <p className="text-[12px] text-amber-600 font-medium leading-snug">
                  {t('recovery_reminder')}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-sm border border-tg-border/20 overflow-hidden border-t-0 border-b-0"
          >
            {!pinEnabled ? (
              <button
                onClick={() => startPinEntry('set')}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-hint/8 transition-colors"
              >
                <div className="w-9 h-9 rounded-[11px] bg-tg-accent/10 border border-tg-accent/15 flex items-center justify-center">
                  <Lock size={17} className="text-tg-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text">{t('enable_pin')}</div>
                </div>
                <ChevronRight size={17} className="text-tg-hint/30" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => startPinEntry('change')}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-hint/8 transition-colors border-b border-tg-border/40"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                    <Lock size={17} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text">{t('change_pin')}</div>
                  </div>
                  <ChevronRight size={17} className="text-tg-hint/30" />
                </button>

                <button
                  onClick={startQuestionsSetup}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-hint/8 transition-colors border-b border-tg-border/40"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                    <HelpCircle size={17} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text">
                      {hasQuestions ? t('security_questions_update') : t('security_questions_setup')}
                    </div>
                    <div className="text-[12px] text-tg-hint mt-0.5">{t('security_questions_desc')}</div>
                  </div>
                  <ChevronRight size={17} className="text-tg-hint/30" />
                </button>

                <button
                  onClick={() => startPinEntry('disable')}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-hint/8 transition-colors border-b border-tg-border/40"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                    <ShieldOff size={17} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text">{t('disable_pin')}</div>
                  </div>
                  <ChevronRight size={17} className="text-tg-hint/30" />
                </button>

                <button
                  onClick={() => {
                    haptic?.impactOccurred('medium');
                    setVerified(false);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-tg-hint/8 transition-colors"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-orange-500/10 border border-orange-500/15 flex items-center justify-center">
                    <Lock size={17} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text">{t('lock_now')}</div>
                    <div className="text-[12px] text-tg-hint mt-0.5">{t('lock_now_desc')}</div>
                  </div>
                  <ChevronRight size={17} className="text-tg-hint/30" />
                </button>
              </>
            )}
          </motion.div>

          {/* Forgot PIN shortcut */}
          {pinEnabled && hasQuestions && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={startRecovery}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity"
            >
              <RotateCcw size={14} />
              {t('forgot_pin')}
            </motion.button>
          )}

          {/* Auto-lock setting */}
          {pinEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-sm border border-tg-border/20 p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Clock size={16} className="text-tg-accent" />
                <div>
                  <div className="text-[14px] font-bold text-tg-text">{t('lock_timeout')}</div>
                  <div className="text-[12px] text-tg-hint">{t('lock_timeout_desc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {lockOptions.map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => settingsMutation.mutate(m)}
                    className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${lockMinutes === m
                        ? 'bg-tg-accent text-white shadow-md shadow-tg-accent/25'
                        : 'bg-tg-text/[0.04] text-tg-hint active:bg-tg-accent/10'
                      }`}
                  >
                    {m}{t('min_abbr')}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      ) : screen === 'pin-entry' ? (
        /* ── PIN Entry Screen ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-5 mt-4 flex flex-col items-center"
        >
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i <= stepIndex ? 24 : 16,
                  backgroundColor: i <= stepIndex ? 'var(--tg-accent, #007aff)' : 'rgba(128,128,128,0.12)',
                }}
                className="h-[3px] rounded-full"
              />
            ))}
          </div>

          {/* Animated icon */}
          <motion.div
            key={pinMode}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className={`w-[64px] h-[64px] rounded-full flex items-center justify-center mb-4 ${pinMode === 'disable'
                ? 'bg-red-500/10 border-2 border-red-500/15'
                : 'bg-tg-accent/10 border-2 border-tg-accent/15'
              }`}
          >
            <Fingerprint
              size={28}
              className={pinMode === 'disable' ? 'text-red-500' : 'text-tg-accent'}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center mb-1"
            >
              <p className="text-[17px] font-bold text-tg-text">
                {step === 'current' ? t('current_pin') : step === 'new' ? t('new_pin') : t('confirm_pin')}
              </p>
              <p className="text-[13px] text-tg-hint mt-1">
                {pinMode === 'disable' ? t('enter_pin_to_disable') : stepSubtitle[step]}
              </p>
            </motion.div>
          </AnimatePresence>

          <PinDots filled={activePin.length} error={!!error} shake={shake} />

          {/* Error badge */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-red-500 text-[12px] font-semibold mb-3 px-4 py-1.5 rounded-xl bg-red-500/[0.07]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Numpad
            onDigit={handleDigit}
            onDelete={handleDelete}
            onCancel={resetAll}
            disabled={isSubmitting}
            cancelLabel={t('cancel')}
          />

          {/* Forgot PIN link in change/disable modes */}
          {pinEnabled && hasQuestions && step === 'current' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={startRecovery}
              className="mt-5 text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity"
            >
              {t('forgot_pin')}
            </motion.button>
          )}
        </motion.div>
      ) : screen === 'questions-setup' ? (
        /* ── Security Questions Setup ── */
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-5 mt-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[48px] h-[48px] rounded-full bg-blue-500/10 border-2 border-blue-500/15 flex items-center justify-center">
              <KeyRound size={22} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[17px] font-bold text-tg-text">{t('security_questions')}</p>
              <p className="text-[13px] text-tg-hint">{t('security_questions_desc')}</p>
            </div>
          </div>

          {/* Step indicator for first-time flow */}
          {goToQuestionsAfterPin && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                </div>
                <span className="text-[12px] font-semibold text-emerald-600">{t('step_set_pin')}</span>
              </div>
              <div className="flex-1 h-px bg-tg-border/20" />
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-tg-accent">2</span>
                </div>
                <span className="text-[12px] font-semibold text-tg-accent">{t('step_questions')}</span>
              </div>
            </div>
          )}

          {/* 3 Question selectors */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionSelector
                key={i}
                index={i}
                selectedId={q.questionId}
                answer={q.answer}
                usedIds={usedQuestionIds}
                onSelectId={(id) => {
                  const copy = [...questions];
                  copy[i] = { ...copy[i], questionId: id };
                  setQuestions(copy);
                }}
                onChangeAnswer={(val) => {
                  const copy = [...questions];
                  copy[i] = { ...copy[i], answer: val };
                  setQuestions(copy);
                }}
                t={t}
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 text-red-500 text-[12px] font-semibold px-4 py-1.5 rounded-xl bg-red-500/[0.07] text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="mt-5 space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveQuestions}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-tg-accent text-white text-[15px] font-bold shadow-lg shadow-tg-accent/25 active:opacity-90 transition-all disabled:opacity-50"
            >
              {questionsMutation.isPending ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                t('save_questions')
              )}
            </motion.button>
            <button
              onClick={resetAll}
              className="w-full py-2.5 text-[13px] font-semibold text-tg-hint active:opacity-70 transition-opacity"
            >
              {t('cancel')}
            </button>
          </div>
        </motion.div>
      ) : screen === 'recovery-questions' ? (
        /* ── Recovery: Answer Questions ── */
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-5 mt-4"
        >
          {myQuestionIds.length === 0 ? (
            /* No questions set */
            <div className="flex flex-col items-center mt-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/15 flex items-center justify-center mb-4">
                <ShieldOff size={28} className="text-red-500" />
              </div>
              <p className="text-[16px] font-bold text-tg-text mb-2">{t('recovery_no_questions')}</p>
              <p className="text-[13px] text-tg-hint leading-snug">{t('recovery_no_questions_desc')}</p>
              <button
                onClick={resetAll}
                className="mt-6 px-6 py-2.5 rounded-xl bg-tg-secondary border border-tg-border/20 text-[14px] font-semibold text-tg-text active:bg-tg-hint/10"
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-[48px] h-[48px] rounded-full bg-amber-500/10 border-2 border-amber-500/15 flex items-center justify-center">
                  <RotateCcw size={22} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-tg-text">{t('recovery_title')}</p>
                  <p className="text-[13px] text-tg-hint">{t('recovery_desc')}</p>
                </div>
              </div>

              {/* Answer inputs */}
              <div className="space-y-3">
                {recoveryAnswers.map((ra, i) => (
                  <motion.div
                    key={ra.questionId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl bg-tg-secondary/60 backdrop-blur-sm border border-tg-border/20 p-4 space-y-2"
                  >
                    <p className="text-[13px] font-semibold text-tg-text">
                      {t(`question_${ra.questionId}`)}
                    </p>
                    <input
                      type="text"
                      value={ra.answer}
                      onChange={(e) => {
                        const copy = [...recoveryAnswers];
                        copy[i] = { ...copy[i], answer: e.target.value };
                        setRecoveryAnswers(copy);
                      }}
                      placeholder={t('recovery_answer_placeholder')}
                      className="w-full px-3.5 py-3 rounded-xl bg-tg-bg/60 border border-transparent text-[14px] text-tg-text placeholder:text-tg-hint/40 focus:outline-none focus:border-tg-accent focus:border-2 transition-colors"
                      autoComplete="off"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-3 text-red-500 text-[12px] font-semibold px-4 py-1.5 rounded-xl bg-red-500/[0.07] text-center"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="mt-5 space-y-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleVerifyRecovery}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-tg-accent text-white text-[15px] font-bold shadow-lg shadow-tg-accent/25 active:opacity-90 transition-all disabled:opacity-50"
                >
                  {recoveryVerifyMutation.isPending ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    t('verify_answers')
                  )}
                </motion.button>
                <button
                  onClick={resetAll}
                  className="w-full py-2.5 text-[13px] font-semibold text-tg-hint active:opacity-70 transition-opacity"
                >
                  {t('cancel')}
                </button>
              </div>
            </>
          )}
        </motion.div>
      ) : screen === 'recovery-new-pin' ? (
        /* ── Recovery: Set New PIN ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-5 mt-4 flex flex-col items-center"
        >
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                animate={{
                  width: i <= (recoveryStep === 'new' ? 0 : 1) ? 24 : 16,
                  backgroundColor:
                    i <= (recoveryStep === 'new' ? 0 : 1)
                      ? 'var(--tg-accent, #007aff)'
                      : 'rgba(128,128,128,0.12)',
                }}
                className="h-[3px] rounded-full"
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="w-[64px] h-[64px] rounded-full bg-emerald-500/10 border-2 border-emerald-500/15 flex items-center justify-center mb-4"
          >
            <KeyRound size={28} className="text-emerald-500" />
          </motion.div>

          <p className="text-[13px] font-semibold text-emerald-600 bg-emerald-500/[0.07] px-3 py-1 rounded-lg mb-3">
            {t('recovery_success')}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={recoveryStep}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              className="text-center mb-1"
            >
              <p className="text-[17px] font-bold text-tg-text">
                {recoveryStep === 'new' ? t('set_new_pin') : t('confirm_new_pin')}
              </p>
              <p className="text-[13px] text-tg-hint mt-1">{t('enter_4_digits')}</p>
            </motion.div>
          </AnimatePresence>

          <PinDots filled={activeRecoveryPin.length} error={!!error} shake={shake} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-red-500 text-[12px] font-semibold mb-3 px-4 py-1.5 rounded-xl bg-red-500/[0.07]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Numpad
            onDigit={handleRecoveryDigit}
            onDelete={handleRecoveryDelete}
            onCancel={resetAll}
            disabled={isSubmitting}
            cancelLabel={t('cancel')}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
