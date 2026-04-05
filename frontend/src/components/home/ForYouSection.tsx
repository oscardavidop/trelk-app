import { memo, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Play, HelpCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../hooks/useTelegram';
import type { LucideIcon } from 'lucide-react';

interface Rec {
  cmd: string;
  label: string;
  icon: LucideIcon;
}

const RECOMMENDATIONS: Rec[] = [
  { cmd: '/start', label: 'get_started_quickly', icon: Play },
  { cmd: '/help', label: 'explore_commands', icon: HelpCircle },
  { cmd: '/play', label: 'try_something_fun', icon: Play },
];

function ForYouSection() {
  const { t } = useTranslation('home');
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const items = useMemo(() => RECOMMENDATIONS, []);

  return (
    <div className="mx-4 mt-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Compass size={14} className="text-tg-accent" />
        <span className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">
          {t('recommended_for_you')}
        </span>
      </div>

      <div className="bg-tg-secondary rounded-xl border border-tg-border/30 overflow-hidden">
        {items.map((rec, i) => (
          <motion.button
            key={rec.cmd}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic?.impactOccurred('light');
              navigate(`/users/ui/${userId}/commands`);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-tg-surface/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-tg-accent/10 flex items-center justify-center flex-shrink-0">
              <rec.icon size={16} className="text-tg-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-tg-accent">{rec.cmd}</span>
              <span className="text-[13px] text-tg-hint ml-2">{t(rec.label)}</span>
            </div>
            <ChevronRight size={16} className="text-tg-hint/40 flex-shrink-0" />
            {i < items.length - 1 && (
              <div className="absolute bottom-0 left-[52px] right-0 h-px bg-tg-border/15" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default memo(ForYouSection);
