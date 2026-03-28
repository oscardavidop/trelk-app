import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../hooks/useTelegram';
import { Sparkles, Terminal, Globe, Camera, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'trelk_has_onboarded';

const STEPS = [
  { icon: Sparkles, color: 'from-violet-500 to-purple-600', key: 'welcome' },
  { icon: Terminal, color: 'from-blue-500 to-tg-accent', key: 'commands' },
  { icon: Globe, color: 'from-emerald-500 to-teal-500', key: 'features' },
] as const;

export function useOnboarding() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(ONBOARDING_KEY));

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setVisible(false);
  }, []);

  return { showOnboarding: visible, completeOnboarding: complete };
}

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const { t } = useTranslation('ui');
  const { haptic } = useTelegram();
  const [step, setStep] = useState(0);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = currentStep.icon;

  const next = () => {
    haptic?.impactOccurred('light');
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    haptic?.impactOccurred('light');
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center px-6"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-tg-secondary rounded-[24px] border border-tg-border/50 p-8 w-full max-w-[340px] shadow-2xl"
      >
        {/* Skip button */}
        <div className="flex justify-end -mt-2 -mr-2 mb-2">
          <button
            onClick={skip}
            className="w-8 h-8 rounded-full bg-tg-text/[0.06] flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={14} className="text-tg-hint" />
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-[24px] bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-lg`}>
            <Icon size={36} className="text-white" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-[22px] font-extrabold text-tg-text text-center mb-2">
          {t(`onboarding_${currentStep.key}_title`)}
        </h2>
        <p className="text-[14px] text-tg-hint text-center leading-relaxed mb-8">
          {t(`onboarding_${currentStep.key}_desc`)}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-tg-accent' : 'w-1.5 bg-tg-text/10'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className="w-full py-3.5 rounded-[14px] bg-tg-accent text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
        >
          {isLast ? t('onboarding_start') : t('onboarding_next')}
          <ChevronRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
