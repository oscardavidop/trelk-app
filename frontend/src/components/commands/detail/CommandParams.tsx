import { memo } from 'react';
import { motion } from 'framer-motion';
import { Hash, MessageSquare, Lock, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BotCommand } from '../../../data/botCommands';
import { cmdSlug } from '../../../data/botCommands';

interface Props {
  cmd: BotCommand;
}

const row = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
};

function CommandParams({ cmd }: Props) {
  const { t } = useTranslation('commandDetail');
  const slug = cmdSlug(cmd);

  const rows: { icon: typeof Hash; color: string; title: string; subtitle: string; badge?: string; badgeColor?: string }[] = [
    {
      icon: Hash,
      color: cmd.requireArgs ? '#f59e0b' : '#10b981',
      title: cmd.requireArgs ? t('args_required') : t('no_args'),
      subtitle: cmd.requireArgs ? t('args_required_desc') : t('no_args_desc'),
      badge: cmd.requireArgs ? t('required_badge', 'required') : t('optional_badge', 'optional'),
      badgeColor: cmd.requireArgs ? '#f59e0b' : '#10b981',
    },
  ];

  if (cmd.supportsInline) {
    rows.push({
      icon: MessageSquare,
      color: '#0ea5e9',
      title: t('supports_inline'),
      subtitle: t('inline_desc', { slug }),
      badge: 'inline',
      badgeColor: '#0ea5e9',
    });
  }

  if (cmd.supportInGroups === false) {
    rows.push({
      icon: Lock,
      color: '#ef4444',
      title: t('private_only'),
      subtitle: t('private_only_desc'),
    });
  }

  if (cmd.maxLengthArgs != null) {
    rows.push({
      icon: Settings2,
      color: '#8b5cf6',
      title: t('char_limit', { count: cmd.maxLengthArgs }),
      subtitle: t('char_limit_desc'),
      badge: `${cmd.maxLengthArgs}`,
      badgeColor: '#8b5cf6',
    });
  }

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
        {t('technical_details')}
      </h2>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 overflow-hidden shadow-sm relative"
      >
        {rows.map((r, i) => (
          <motion.div
            key={i}
            variants={row}
            className="flex items-center gap-3.5 p-3.5 transition-colors active:bg-tg-hint/5 border-b border-tg-border/20 last:border-0"
          >
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${r.color}12`,
                border: `1px solid ${r.color}25`,
              }}
            >
              <r.icon size={18} style={{ color: r.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-tg-text leading-tight flex items-center gap-2">
                {r.title}
                {r.badge && (
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[6px] tracking-wider"
                    style={{
                      color: r.badgeColor,
                      backgroundColor: `${r.badgeColor}12`,
                      border: `1px solid ${r.badgeColor}25`,
                    }}
                  >
                    {r.badge}
                  </span>
                )}
              </div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">
                {r.subtitle}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default memo(CommandParams);
