import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Star, TrendingUp, Users, Sparkles } from 'lucide-react';
import { fetchRecommendations, type RecommendationItem } from '@/services/recommendationsApi';
import { BOT_COMMANDS, cmdSlug, CATEGORY_META } from '@/data/botCommands';
import { MOTION } from '@/design';
import { useTelegram } from '@/hooks/useTelegram';

const REASON_ICON: Record<string, { icon: typeof Star; color: string }> = {
  category: { icon: Compass, color: 'text-tg-accent' },
  co_usage: { icon: Users, color: 'text-emerald-500' },
  popular: { icon: TrendingUp, color: 'text-amber-500' },
  trending: { icon: Sparkles, color: 'text-purple-500' },
};

export default function ForYouSection() {
  const { t } = useTranslation('home');
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const { data: recs, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => fetchRecommendations(10),
    staleTime: 5 * 60 * 1000,
  });

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };

  if (!isLoading && (!recs || recs.length === 0)) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-6 mb-3">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
          <Compass size={14} /> {t('for_you', 'For You')}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[140px] h-[120px] flex-shrink-0 rounded-[20px] bg-tg-secondary border border-tg-border/30 animate-pulse relative overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {recs!.map((rec) => (
            <RecCard key={rec.command} rec={rec} onTap={go} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecCard({ rec, onTap }: { rec: RecommendationItem; onTap: (slug: string) => void }) {
  const { t } = useTranslation('home');
  const meta = BOT_COMMANDS.find((c) => cmdSlug(c) === rec.command || c.uniqueName === rec.command);
  const catMeta = meta ? CATEGORY_META[meta.category] : undefined;
  const Icon = catMeta?.icon;
  const label = meta?.name?.[0] || rec.command;
  const reason = REASON_ICON[rec.reason] || REASON_ICON.popular;

  return (
    <motion.button
      whileTap={MOTION.tap}
      onClick={() => onTap(rec.command)}
      className="flex-shrink-0 w-[140px] rounded-[20px] bg-tg-secondary/70 border border-tg-border/30 p-3.5 text-left shadow-sm active:scale-[0.96] transition-transform relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-tg-accent/5 blur-2xl" />

      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-[12px] bg-tg-accent/10 flex items-center justify-center">
          {Icon ? <Icon size={18} className="text-tg-accent" /> : (
            <span className="text-[14px]">⚡</span>
          )}
        </div>
        <reason.icon size={12} className={reason.color} />
      </div>

      <p className="text-[13px] font-semibold text-tg-text leading-tight line-clamp-1 capitalize">
        {label}
      </p>

      {rec.rating != null && (
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={10} className="text-amber-500 fill-amber-500" />
          <span className="text-[11px] text-tg-hint">{rec.rating}</span>
          {rec.ratingsCount != null && (
            <span className="text-[10px] text-tg-hint/60">({rec.ratingsCount})</span>
          )}
        </div>
      )}

      <span className="inline-block mt-1.5 text-[10px] text-tg-accent/80 font-medium capitalize">
        {t(`rec_reason_${rec.reason}`, rec.reason.replace('_', ' '))}
      </span>
    </motion.button>
  );
}
