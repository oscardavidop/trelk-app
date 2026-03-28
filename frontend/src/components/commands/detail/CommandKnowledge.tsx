import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, Lightbulb } from 'lucide-react';
import { fetchCommandKnowledge } from '../../../services/commandStatsApi';

interface Props {
  slug: string;
}

function CommandKnowledge({ slug }: Props) {
  const { t } = useTranslation('commandDetail');

  const { data } = useQuery({
    queryKey: ['command-knowledge', slug],
    queryFn: () => fetchCommandKnowledge(slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (!data) return null;

  const { knownIssues, tips } = data;
  if (!knownIssues.length && !tips.length) return null;

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <BookOpen size={15} className="text-tg-accent" />
        {t('known_issues_tips', 'Known Issues & Tips')}
      </h2>

      <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 overflow-hidden shadow-sm">
        {/* Known Issues */}
        {knownIssues.length > 0 && (
          <div className="p-4 border-b border-tg-border/20 last:border-0">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={13} className="text-amber-500" />
              <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {t('known_issues', 'Known Issues')}
              </span>
            </div>
            <ul className="space-y-1.5">
              {knownIssues.map((issue, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-[13px] text-tg-text/85 leading-relaxed"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0 opacity-70" />
                  <span>{issue}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-tg-accent" />
              <span className="text-[12px] font-bold text-tg-accent uppercase tracking-wider">
                {t('tips', 'Tips')}
              </span>
            </div>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-[13px] text-tg-text/85 leading-relaxed"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-tg-accent mt-2 flex-shrink-0 opacity-70" />
                  <span>{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(CommandKnowledge);
