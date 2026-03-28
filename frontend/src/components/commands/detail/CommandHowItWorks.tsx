import { memo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { COMMAND_WORKS_STEPS } from '../../../data/commandMocks';

interface Props {
  slug: string;
  usage: string;
}

function CommandHowItWorks({ slug, usage }: Props) {
  const { t } = useTranslation('commandDetail');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const cmdName = usage.split(' ')[0] || `/${slug}`;
  const steps = COMMAND_WORKS_STEPS[slug] || [
    t('step_1', { cmd: cmdName }),
    t('step_2'),
    t('step_3'),
  ];

  // Trigger animation when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Progressively reveal steps like a chat
  useEffect(() => {
    if (!visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), 600 + i * 900));
    });
    timers.push(
      setTimeout(() => {
        setActiveStep(steps.length); // Esto hará que activeStep sea > que el último índice
      }, 600 + steps.length * 900)
    );

    return () => timers.forEach(clearTimeout);
  }, [visible, steps.length]);

  return (
    <section className="px-5 mt-8" ref={sectionRef}>
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
        {t('how_it_works')}
      </h2>
      <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-5 shadow-sm relative overflow-hidden">
        <div className="space-y-4 relative">
          <AnimatePresence>
            {steps.map((text, i) => {
              if (i > activeStep) return null;
              const done = activeStep > i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="flex items-start gap-3.5 relative"
                >
                  {/* Connector line */}
                  {i !== steps.length - 1 && (
                    <div className="absolute left-[13px] top-8 bottom-[-16px] w-[2px] bg-tg-accent/15" />
                  )}

                  {/* Step indicator: number → check */}
                  <div className={`w-[28px] h-[28px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 z-10 shadow-sm transition-colors duration-500 ${done
                      ? 'bg-emerald-500/15 border border-emerald-500/25'
                      : 'bg-tg-accent/15 border border-tg-accent/25'
                    }`}>
                    <AnimatePresence mode="wait">
                      {done ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                        >
                          <Check size={14} className="text-emerald-500" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="num"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-[13px] font-bold text-tg-accent"
                        >
                          {i + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Chat bubble */}
                  <div className="flex-1 bg-tg-text/[0.03] border border-tg-border/25 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                    <p className="text-[13.5px] font-medium text-tg-text leading-relaxed">
                      {text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {visible && activeStep < steps.length &&(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 pl-[42px]"
            >
              {[0, 1, 2].map((d) => (
                <motion.div
                  key={d}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: d * 0.15 }}
                  className="w-[5px] h-[5px] rounded-full bg-tg-hint/40"
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(CommandHowItWorks);
