import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../hooks/useTelegram';

interface Props {
  streakDays?: number;
}

function StreakSection({ streakDays = 1 }: Props) {
  const { t } = useTranslation('home');
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <div className="mx-4 mt-3">
      <div className="bg-tg-secondary rounded-xl px-4 py-3 border border-tg-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={16} className="text-orange-400" />
          <span className="text-[13px] font-bold text-tg-text">{t('streak_title')}</span>
        </div>

        <p className="text-[13px] text-tg-text leading-relaxed">
          {t('streak_day', { count: streakDays })}
        </p>
        <p className="text-[12px] text-tg-hint mt-0.5">
          {t('streak_encourage')}
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            haptic?.impactOccurred('light');
            navigate(`/users/ui/${userId}/commands`);
          }}
          className="mt-3 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-tg-accent/10 text-tg-accent text-[13px] font-semibold active:scale-95 transition-all"
        >
          {t('streak_cta')}
          <ArrowRight size={14} />
        </motion.button>
      </div>
    </div>
  );
}

export default memo(StreakSection);
