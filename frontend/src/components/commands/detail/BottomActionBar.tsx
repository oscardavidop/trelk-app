import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart, Share, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../hooks/useTelegram';

interface Props {
  slug: string;
  isFav: boolean;
  reported: boolean;
  description: string;
  className?: string;
  onToggleFav: () => void;
  onReport: () => void;
}

function BottomActionBar({ slug, isFav, reported, description, className, onToggleFav, onReport }: Props) {
  const { t } = useTranslation('commandDetail');
  const { t: tReports } = useTranslation('reports');
  const { haptic, webApp } = useTelegram();

  const runInTelegram = useCallback(() => {
    webApp?.openTelegramLink(`https://t.me/TrelkBot?start=${slug}`);
    haptic?.impactOccurred('medium');
  }, [slug, webApp, haptic]);

  const share = useCallback(() => {
    const text = encodeURIComponent(t('share_command_text', { command: slug, description }));
    webApp?.openTelegramLink(`https://t.me/share/url?text=${text} `);
    haptic?.impactOccurred('light');
  }, [slug, description, t, webApp, haptic]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
      className={`${className}`}
    >
      <div className="max-w-[480px] mx-auto pointer-events-auto">
        <div className="bg-tg-bg/90 backdrop-blur-xl border-t border-tg-border/40 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-3">
          <div className="flex items-center gap-2.5">
            {/* Main CTA */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={runInTelegram}
              className="flex-1 py-3 rounded-[16px] bg-tg-accent text-white text-[13px] sm:text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-tg-accent/25 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0 pointer-events-none" />
              <Send size={16} className="fill-white/20 relative z-10" />
              <span className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">
                {t('run_in_telegram')}
              </span>
            </motion.button>

            {/* Fav */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onToggleFav}
              className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center border transition-all ${isFav
                ? 'bg-pink-500/10 border-pink-500/25 text-pink-500'
                : 'bg-tg-secondary border-tg-border/40 text-tg-hint'
                }`}
            >
              <Heart size={18} className={isFav ? 'fill-pink-500' : ''} />
            </motion.button>

            {/* Share */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={share}
              className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center bg-tg-secondary border border-tg-border/40 text-tg-hint"
            >
              <Share size={17} />
            </motion.button>

            {/* Report */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onReport}
              disabled={reported}
              className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center border transition-all ${reported
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                : 'bg-tg-secondary border-tg-border/40 text-tg-hint'
                }`}
            >
              <Flag size={17} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(BottomActionBar);
