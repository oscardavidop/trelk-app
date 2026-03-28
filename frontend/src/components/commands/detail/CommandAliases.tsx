import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Hash, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';
import { useToastStore } from '../../../stores';

interface Props {
  aliases: string[];
}

function CommandAliases({ aliases }: Props) {
  const { t } = useTranslation('commandDetail');
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);
  const [copiedAlias, setCopiedAlias] = useState<string | null>(null);

  const copy = useCallback(
    async (alias: string) => {
      try {
        await navigator.clipboard.writeText(`/${alias}`);
        haptic?.notificationOccurred('success');
        showToast(t('copied_clipboard'), 'success');
        setCopiedAlias(alias);
        setTimeout(() => setCopiedAlias(null), 2000);
      } catch {
        haptic?.notificationOccurred('error');
      }
    },
    [haptic, showToast, t],
  );

  if (aliases.length <= 1) return null;

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5">
        <Hash size={14} className="text-tg-hint/60" />
        {t('allowed_aliases')}
      </h2>

      <div className="bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2.5">
          {aliases.map((alias) => (
            <motion.button
              key={alias}
              whileTap={{ scale: 0.92 }}
              onClick={() => copy(alias)}
              className={`px-3 py-1.5 rounded-[12px] border text-[14px] font-mono font-semibold transition-all ${
                copiedAlias === alias
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-tg-hint/10 border-tg-border/20 text-tg-text active:bg-tg-hint/20'
              }`}
            >
              {copiedAlias === alias ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} /> /{alias}
                </span>
              ) : (
                `/${alias}`
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(CommandAliases);
