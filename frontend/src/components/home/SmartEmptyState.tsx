import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Globe, Camera, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../hooks/useTelegram';

const STARTERS = [
  { cmd: '/play', labelKey: 'play_desc', icon: Music, color: 'text-purple-400' },
  { cmd: '/translate', labelKey: 'translate_desc', icon: Globe, color: 'text-blue-400' },
  { cmd: '/ssweb', labelKey: 'ssweb_desc', icon: Camera, color: 'text-emerald-400' },
] as const;

function SmartEmptyState() {
  const { t } = useTranslation('home');
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-4 mt-4"
    >
      {/* Welcome text */}
      <div className="text-center mb-4">
        <h2 className="text-[18px] font-bold text-tg-text">{t('welcome_title')}</h2>
        <p className="text-[14px] text-tg-hint mt-1">{t('welcome_desc')}</p>
      </div>

      {/* Starter commands */}
      <div className="mb-3 px-1">
        <span className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">
          {t('welcome_start')}
        </span>
      </div>

      <div className="bg-tg-secondary rounded-xl border border-tg-border/30 overflow-hidden">
        {STARTERS.map((s, i) => (
          <div
            key={s.cmd}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="w-8 h-8 rounded-lg bg-tg-surface/60 flex items-center justify-center flex-shrink-0">
              <s.icon size={16} className={s.color} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-tg-accent">{s.cmd}</span>
              <span className="text-[13px] text-tg-hint ml-2">{t(s.labelKey)}</span>
            </div>
            {i < STARTERS.length - 1 && (
              <div className="absolute bottom-0 left-[52px] right-0 h-px bg-tg-border/15" />
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          haptic?.impactOccurred('medium');
          navigate(`/users/ui/${userId}/commands`);
        }}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tg-accent text-white text-[14px] font-semibold active:brightness-90 transition-all"
      >
        {t('explore_commands_cta')}
        <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  );
}

export default memo(SmartEmptyState);
