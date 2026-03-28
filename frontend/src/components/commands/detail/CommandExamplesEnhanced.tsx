import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ChevronDown, ChevronUp, Code, CheckCircle2, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommandExample } from '../../../data/commandMocks';
import { useTelegram } from '../../../hooks/useTelegram';
import { useToastStore } from '../../../stores';

interface Props {
  examples: CommandExample[];
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function CommandExamplesEnhanced({ examples }: Props) {
  const { haptic, webApp } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const showToast = useToastStore((s) => s.show);
  const [expanded, setExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyText = useCallback(
    (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      haptic?.notificationOccurred('success');
      showToast(t('copied_clipboard'), 'success');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    },
    [haptic, showToast, t],
  );

  const executeCommand = useCallback(
    (text: string) => {
      const cmd = text.startsWith('/') ? text.slice(1) : text;
      webApp?.openTelegramLink(`https://t.me/TrelkBot?start=${encodeURIComponent(cmd)}`);
      haptic?.impactOccurred('medium');
    },
    [webApp, haptic],
  );

  if (!examples.length) return null;

  const visible = expanded ? examples : examples.slice(0, 3);

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <Code size={15} className="text-tg-hint/60" />
        {t('usage_examples')}
      </h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 overflow-hidden shadow-sm relative"
      >
        <AnimatePresence mode="popLayout">
          {visible.map((ex, i) => (
            <motion.div
              key={i}
              variants={item}
              layout
              className="p-4 border-b border-tg-border/20 last:border-0 transition-colors active:bg-tg-hint/5"
            >
              {ex.description && (
                <div className="mb-2">
                  <span className="text-[13px] font-medium text-tg-hint leading-snug">
                    {ex.description}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <code className="flex-1 text-[13px] font-mono text-tg-text bg-tg-bg/60 backdrop-blur-sm border border-tg-border/30 rounded-[12px] px-3.5 py-2.5 truncate">
                  {ex.text}
                </code>

                {/* Copy */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyText(ex.text, i)}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-200 border ${
                    copiedIndex === i
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-tg-hint/10 border-tg-border/30 text-tg-hint'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {copiedIndex === i ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <CheckCircle2 size={15} strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Copy size={15} strokeWidth={2} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {examples.length > 3 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            haptic?.impactOccurred('light');
            setExpanded(!expanded);
          }}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-full bg-tg-accent/10 text-[14px] font-semibold text-tg-accent active:scale-95 transition-transform"
        >
          {expanded ? (
            <>
              {t('hide_examples')}
              <ChevronUp size={18} strokeWidth={2.5} />
            </>
          ) : (
            <>
              {t('show_more', { count: examples.length - 3 })}
              <ChevronDown size={18} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      )}
    </section>
  );
}

export default memo(CommandExamplesEnhanced);
