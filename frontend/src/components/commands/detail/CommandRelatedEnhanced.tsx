import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Compass, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META, cmdSlug } from '../../../data/botCommands';
import { useTelegram } from '../../../hooks/useTelegram';
import { getRelated } from '../../../services/commandSimilarity';
import { getCategoryBrand } from '../../../design';

interface Props {
  slug: string;
}

const card = {
  hidden: { opacity: 0, x: 20, scale: 0.95 },
  show: { opacity: 1, x: 0, scale: 1 },
};

function CommandRelatedEnhanced({ slug }: Props) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');

  const commands = getRelated(slug, 6);
  if (!commands.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 px-5 pl-6">
        <Compass size={15} className="text-tg-hint/60" />
        {t('related_commands', 'Related')}
      </h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="flex gap-3 overflow-x-auto pb-3 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {commands.map((cmd) => {
          const s = cmdSlug(cmd);
          const cat = CATEGORY_META[cmd.category];
          const CatIcon = cat?.icon;
          const isComponent = typeof CatIcon !== 'string';

          return (
            <motion.button
              key={s}
              variants={card}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptic?.impactOccurred('light');
                navigate(`/users/ui/${userId}/bot-commands/${s}`);
              }}
              className="flex-shrink-0 w-[140px] bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-3.5 text-left shadow-sm group transition-colors active:bg-tg-hint/10 relative overflow-hidden"
            >
              {/* Glow orb */}
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-30 pointer-events-none" style={{ background: getCategoryBrand(cmd.category).glow }} />
              {/* Top shine */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
              <div
                className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center mb-3 transition-transform group-active:scale-95 relative z-10"
                style={{
                  backgroundColor: `${cat?.color}15`,
                  border: `1px solid ${cat?.color}20`,
                }}
              >
                {isComponent && CatIcon ? (
                  // @ts-ignore
                  <CatIcon size={18} style={{ color: cat?.color }} />
                ) : (
                  <span className="text-[16px]">{CatIcon}</span>
                )}
              </div>

              <div className="text-[14px] font-bold text-tg-text font-mono truncate leading-tight">
                /{s}
              </div>
              <div className="text-[11px] font-medium text-tg-hint mt-1 line-clamp-2 leading-snug">
                {cmd.description}
              </div>

              <div className="flex items-center gap-1 mt-2 text-tg-accent/70 text-[10px] font-bold">
                <span>{t('view_details', 'View')}</span>
                <ChevronRight size={12} />
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}

export default memo(CommandRelatedEnhanced);
