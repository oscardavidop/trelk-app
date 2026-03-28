import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cmdSlug } from '../../../data/botCommands';
import type { BotCommand } from '../../../data/botCommands';

interface Props {
  prevCmd?: BotCommand;
  nextCmd?: BotCommand;
  onNavigate: (slug: string) => void;
}

function CommandNavigation({ prevCmd, nextCmd, onNavigate }: Props) {
  const { t } = useTranslation('commandDetail');

  return (
    <section className="px-5 mt-8">
      <div className="flex gap-3">
        {prevCmd ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate(cmdSlug(prevCmd))}
            className="flex-1 bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 text-left shadow-sm group"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold text-tg-hint uppercase tracking-wider mb-1.5">
              <ArrowLeft
                size={14}
                className="group-hover:-translate-x-1 transition-transform"
              />
              {t('previous')}
            </div>
            <div className="text-[15px] font-bold text-tg-text font-mono truncate">
              /{cmdSlug(prevCmd)}
            </div>
          </motion.button>
        ) : (
          <div className="flex-1" />
        )}

        {nextCmd ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate(cmdSlug(nextCmd))}
            className="flex-1 bg-tg-secondary/80 backdrop-blur-sm rounded-[20px] border border-tg-border/40 p-4 text-right shadow-sm group"
          >
            <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-tg-hint uppercase tracking-wider mb-1.5">
              {t('next')}
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
            <div className="text-[15px] font-bold text-tg-text font-mono truncate">
              /{cmdSlug(nextCmd)}
            </div>
          </motion.button>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </section>
  );
}

export default memo(CommandNavigation);
