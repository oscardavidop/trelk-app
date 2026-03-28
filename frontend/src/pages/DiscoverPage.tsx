import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug } from '../data/botCommands';
import type { BotCommand } from '../data/botCommands';
import { ChevronRight, Search, TrendingUp, Star, Sparkles } from 'lucide-react';
import { fetchCommandRankings } from '../services/commandStatsApi';
import { getCategoryBrand, MOTION, staggerContainer, staggerItem } from '../design';

// "New" commands: ones that don't appear in the popular list (recently added heuristic)
const NEW_SLUGS = ['apk', 'alert', 'tts', 'shorten'];
const bySlug = (slugs: string[]) =>
  slugs.map((s) => BOT_COMMANDS.find((c) => cmdSlug(c) === s)).filter(Boolean) as BotCommand[];

export default function DiscoverPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('discover');
  const { haptic } = useTelegram();
  const [trending, setTrending] = useState<BotCommand[]>([]);
  const [popular, setPopular] = useState<BotCommand[]>([]);

  const commandMap = useMemo(
    () => new Map(BOT_COMMANDS.map((cmd) => [cmdSlug(cmd), cmd] as const)),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    fetchCommandRankings(5, 5)
      .then((data) => {
        if (cancelled) return;

        const trendingCommands = data.trending
          .map((item) => commandMap.get(item.command))
          .filter((cmd): cmd is BotCommand => cmd !== undefined);
        const popularCommands = data.popular
          .map((item) => commandMap.get(item.command))
          .filter((cmd): cmd is BotCommand => cmd !== undefined);

        setTrending(trendingCommands.length ? trendingCommands : BOT_COMMANDS.slice(0, 5));
        setPopular(popularCommands.length ? popularCommands : BOT_COMMANDS.slice(0, 5));
      })
      .catch(() => {
        if (cancelled) return;
        setTrending(BOT_COMMANDS.slice(0, 5));
        setPopular(BOT_COMMANDS.slice(0, 5));
      });

    return () => {
      cancelled = true;
    };
  }, [commandMap]);

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };
  const goList = () => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/list`);
  };

  type SectionIcon = typeof TrendingUp;
  const sections: { title: string; icon: SectionIcon; iconClass: string; commands: BotCommand[]; accent: string }[] = [
    {
      title: t('trending'),
      icon: TrendingUp,
      iconClass: 'text-orange-500',
      commands: trending,
      accent: 'from-orange-500 to-red-500',
    },
    {
      title: t('popular_week'),
      icon: Star,
      iconClass: 'text-amber-400',
      commands: popular,
      accent: 'from-amber-400 to-yellow-500',
    },
    {
      title: t('new_commands'),
      icon: Sparkles,
      iconClass: 'text-violet-400',
      commands: bySlug(NEW_SLUGS),
      accent: 'from-violet-500 to-purple-600',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-24 relative"
    >
      
      {/* -- Hero Header -- */}
      <motion.div variants={staggerItem} className="relative px-5 pt-8 pb-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/5" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl animate-glow-pulse" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-pink-500/8 blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="relative z-10">
          <h1 className="text-[26px] font-extrabold text-tg-text leading-none">{t('title')}</h1>
          <p className="text-[14px] font-medium text-tg-hint/80 mt-1.5 tracking-wide">{t('subtitle')}</p>
        </div>
      </motion.div>

      {/* -- Search Banner (Glass) -- */}
      <motion.div variants={staggerItem} className="px-5 mt-1 mb-4">
        <motion.button
          whileTap={MOTION.tapLight}
          onClick={goList}
          className="w-full flex items-center gap-3 bg-tg-secondary/60 backdrop-blur-xl rounded-[16px] border border-tg-border/30 px-4 py-3.5 transition-colors shadow-sm"
        >
          <Search size={18} className="text-tg-hint/50" />
          <span className="text-[14px] font-medium text-tg-hint/80">{t('search_all')}</span>
        </motion.button>
      </motion.div>

      {/* -- Sections (Carousels) -- */}
      {sections.map(({ title, icon: SectionIcon, iconClass, commands, accent }) => {
        return (
          <motion.section key={title} variants={staggerItem} className="mt-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <h2 className="text-[14px] font-bold text-tg-hint uppercase flex items-center gap-2">
                <SectionIcon size={15} className={iconClass} /> {title}
              </h2>
              <button onClick={goList} className="text-[12px] font-bold text-tg-accent hover:brightness-125 transition-all">
                {t('see_more')}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto px-5 pb-3 -mx-5 pl-10 pr-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {commands.map((cmd) => {
                const slug = cmdSlug(cmd);
                const cat = CATEGORY_META[cmd.category];
                const brand = getCategoryBrand(cmd.category);
                const CatIcon = typeof cat?.icon !== 'string' ? cat?.icon : undefined;
                
                return (
                  <motion.button
                    key={slug}
                    whileTap={MOTION.tap}
                    onClick={() => go(slug)}
                    className="flex-shrink-0 w-[150px] relative bg-tg-secondary border border-tg-border/30 rounded-[24px] p-4 text-left overflow-hidden shadow-sm flex flex-col h-full group"
                  >
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${brand.gradient} opacity-[0.06] transition-opacity group-hover:opacity-[0.1]`} />
                    {/* Glow */}
                    <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: brand.glow }} />
                    {/* Shine */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                    <div className="relative z-10 flex items-start justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${accent} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform`}
                      >
                        {CatIcon ? (
                          <CatIcon size={18} className="text-white" />
                        ) : (
                          <span className="text-lg" />
                        )}
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex-1">
                      <div className="text-[15px] font-extrabold text-tg-text font-mono truncate mb-0.5">/{slug}</div>
                      <div className="text-[12px] font-medium text-tg-hint leading-snug line-clamp-2">{cmd.description}</div>
                    </div>
                    
                    <div className="relative z-10 mt-3.5 flex items-center gap-1">
                      <span
                        className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full"
                        style={{ color: cat?.color, backgroundColor: `${cat?.color}12`, border: `1px solid ${cat?.color}25` }}
                      >
                        {cat?.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        );
      })}

      {/* -- Categories Grid -- */}
      <motion.section variants={staggerItem} className="px-5 mt-8">
        <h2 className="text-[14px] font-bold text-tg-hint uppercase mb-3">{t('categories')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = BOT_COMMANDS.filter((c) => c.category === key).length;
            const CatIcon = typeof meta.icon !== 'string' ? meta.icon : undefined;
            const brand = getCategoryBrand(key);
            
            return (
              <motion.button
                key={key}
                whileTap={MOTION.tap}
                onClick={() => {
                  haptic?.impactOccurred('light');
                  navigate(`/users/ui/${userId}/bot-commands/list?cat=${key}`);
                }}
                className="relative flex items-center gap-3.5 bg-tg-secondary border border-tg-border/30 rounded-[20px] p-3.5 text-left overflow-hidden shadow-sm group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${brand.gradient} opacity-[0.04] transition-opacity group-hover:opacity-[0.08]`} />
                <div
                  className="relative z-10 w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${meta.color}15` }}
                >
                  {CatIcon ? (
                    <CatIcon size={18} style={{ color: meta.color }} />
                  ) : (
                    <span className="text-lg">
                        <meta.icon />
                    </span>
                  )}
                </div>
                <div className="relative z-10 min-w-0">
                  <div className="text-[14px] font-bold text-tg-text truncate">{meta.label}</div>
                  <div className="text-[11px] font-medium text-tg-hint mt-0.5">{t('common:commands_count', { count })}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* -- Browse all Button -- */}
      <motion.div variants={staggerItem} className="px-5 mt-8 pb-4">
        <motion.button
          whileTap={MOTION.tap}
          onClick={goList}
          className="w-full py-4 rounded-[16px] bg-tg-accent/10 border border-tg-accent/20 text-tg-accent text-[15px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          {t('explore_all')}
          <ChevronRight size={18} strokeWidth={2.5} />
        </motion.button>
      </motion.div>

    </motion.div>
  );
}