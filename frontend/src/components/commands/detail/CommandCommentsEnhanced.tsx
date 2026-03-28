import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ThumbsUp, Clock, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommandComment } from '../../../data/commandMocks';

interface Props {
  comments: CommandComment[];
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function CommandCommentsEnhanced({ comments }: Props) {
  const { t } = useTranslation('commandDetail');
  const [expanded, setExpanded] = useState(false);

  if (!comments.length) return null;

  const visible = expanded ? comments : comments.slice(0, 3);

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <MessageCircle size={15} className="text-tg-hint/60" />
        {t('comments_count', { count: comments.length })}
      </h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="space-y-2.5"
      >
        <AnimatePresence>
          {visible.map((c) => (
            <motion.div
              key={c.id}
              variants={item}
              layout
              className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-4 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-2.5">
                {/* Avatar */}
                <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-tg-accent/20 to-tg-accent/5 border border-tg-accent/20 flex items-center justify-center text-[13px] font-bold text-tg-accent flex-shrink-0">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    c.user[0].toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-bold text-tg-text block leading-tight truncate">
                    {c.user}
                  </span>
                  <div className="flex items-center gap-1 text-tg-hint/70 mt-0.5">
                    <Clock size={10} />
                    <span className="text-[10px] font-medium">{c.date}</span>
                  </div>
                </div>

                {/* Likes */}
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-tg-hint/5 border border-tg-border/30 text-tg-hint/60 active:text-tg-accent active:bg-tg-accent/10 transition-colors">
                  <ThumbsUp size={12} />
                  <span className="text-[11px] font-bold">{c.likes}</span>
                </button>
              </div>

              {/* Message bubble */}
              <div className="bg-tg-bg/40 rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5 border border-tg-border/20">
                <p className="text-[13px] text-tg-text/90 leading-relaxed">{c.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {comments.length > 3 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-full bg-tg-accent/10 text-[14px] font-semibold text-tg-accent"
        >
          {expanded
            ? t('hide_comments', 'Hide')
            : t('show_more_comments', { count: comments.length - 3, defaultValue: `Show ${comments.length - 3} more` })}
          <ChevronDown
            size={18}
            strokeWidth={2.5}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </motion.button>
      )}
    </section>
  );
}

export default memo(CommandCommentsEnhanced);
