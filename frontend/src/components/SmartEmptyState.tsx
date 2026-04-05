import { memo, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Heart, Star, Clock, Sparkles, Music, Globe, Camera, MessageSquare } from 'lucide-react';

/* ── Suggestion presets per context ── */
interface Suggestion {
  slug: string;
  icon: typeof Star;
  label: string;
}

const PRESETS: Record<string, Suggestion[]> = {
  favorites: [
    { slug: 'play', icon: Music, label: '/play' },
    { slug: 'translate', icon: Globe, label: '/translate' },
    { slug: 'ssweb', icon: Camera, label: '/ssweb' },
  ],
  activity: [
    { slug: 'play', icon: Music, label: '/play your favorite song' },
    { slug: 'chatgpt', icon: MessageSquare, label: '/chatgpt ask anything' },
  ],
  notifications: [],
  reviews: [
    { slug: 'play', icon: Music, label: '/play' },
    { slug: 'translate', icon: Globe, label: '/translate' },
  ],
};

const CONTEXT_ICONS: Record<string, typeof Star> = {
  favorites: Heart,
  activity: Clock,
  notifications: Sparkles,
  reviews: Star,
};

interface Props {
  context: 'favorites' | 'activity' | 'notifications' | 'reviews' | string;
  title: string;
  description?: string;
}

function SmartEmptyState({ context, title, description }: Props) {
  const { t } = useTranslation('common');
  const { userId } = useParams();
  const navigate = useNavigate();

  const suggestions = useMemo(() => PRESETS[context] || PRESETS.favorites, [context]);
  const Icon = CONTEXT_ICONS[context] || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-8 px-4 rounded-[24px] bg-tg-secondary border border-tg-border/40 text-center shadow-sm flex flex-col items-center justify-center"
    >
      <div className="w-[56px] h-[56px] rounded-[16px] bg-tg-hint/10 flex items-center justify-center mb-4 shadow-inner">
        <Icon size={28} className="text-tg-hint/40" />
      </div>

      <h3 className="text-[18px] font-bold text-tg-text mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] font-medium text-tg-hint leading-relaxed max-w-[240px] mx-auto">
          {description}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-5 w-full">
          <p className="text-[11px] font-semibold text-tg-hint/60 uppercase tracking-wider mb-2.5">
            {t('try_these', 'Try these')}
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => navigate(`/users/ui/${userId}/bot-commands/${s.slug}`)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] bg-tg-bg/60 border border-tg-border/30 text-left transition-colors active:bg-tg-accent/5 group"
              >
                <div className="w-8 h-8 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center group-active:scale-95 transition-transform">
                  <s.icon size={16} className="text-tg-accent" />
                </div>
                <span className="text-[14px] font-semibold text-tg-text/80 font-mono">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default memo(SmartEmptyState);
