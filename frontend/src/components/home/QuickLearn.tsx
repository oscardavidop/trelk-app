import { memo } from 'react';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pickTip } from '../../data/tips';

// Computed once per mount — avoids repeats via sessionStorage
const tip = pickTip();

function QuickLearn() {
  const { t } = useTranslation('home');

  return (
    <div className="mx-5">
      <div className="rounded-[20px] bg-tg-secondary border border-tg-border/15 overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-4">
          <div className="w-8 h-8 rounded-[10px] bg-tg-bg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb size={15} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-tg-hint uppercase tracking-[0.08em]">
              {t('did_you_know')}
            </span>
            <p className="text-[13px] text-tg-text mt-1.5 leading-[1.5]">
              {t(tip, { defaultValue: tip })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(QuickLearn);
