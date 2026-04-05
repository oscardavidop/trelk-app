import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../hooks/useTelegram';
import { getFeatureOfTheDay } from '../../data/features';

// Computed once per page load — deterministic daily rotation
const feature = getFeatureOfTheDay();

function FeatureSpotlight() {
  const { t } = useTranslation('home');
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <div className="mx-5">
      <div className="rounded-[20px] bg-tg-secondary border border-tg-border/15 overflow-hidden">
        <div className="px-4 pt-4 pb-3.5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-[11px] font-bold text-tg-hint uppercase tracking-[0.08em]">
              {t('feature_title')}
            </span>
          </div>

          <p className="text-[15px] font-bold text-tg-text leading-snug">
            {t(feature.titleKey, { defaultValue: feature.titleKey })}
          </p>
          <p className="text-[13px] text-tg-hint mt-1 leading-relaxed">
            {t(feature.descKey, { defaultValue: feature.descKey })}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptic?.impactOccurred('light');
            navigate(`/users/ui/${userId}${feature.route}`);
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-tg-bg/50 border-t border-tg-border/10 active:bg-tg-bg/80 transition-colors"
        >
          <span className="text-[13px] font-semibold text-tg-accent">{t('feature_cta')}</span>
          <ChevronRight size={15} className="text-tg-accent" />
        </motion.button>
      </div>
    </div>
  );
}

export default memo(FeatureSpotlight);
