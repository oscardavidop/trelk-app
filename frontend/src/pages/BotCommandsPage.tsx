import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { BOT_COMMANDS, cmdSlug, CATEGORY_META, getCategories } from '../data/botCommands';
import type { BotCommand } from '../data/botCommands';
import CommandCard from '../components/commands/CommandCard';
import StickyHeader from '../components/StickyHeader';
import { TrendingUp, Star, Folder, ArrowRight } from 'lucide-react';
import { fetchCommandRankings } from '../services/commandStatsApi';
import { getCategoryBrand, MOTION, staggerContainer, staggerItem } from '../design';

export default function BotCommandsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const [trending, setTrending] = useState<BotCommand[]>([]);
  const [popular, setPopular] = useState<BotCommand[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const commandMap = useMemo(
    () => new Map(BOT_COMMANDS.map((cmd) => [cmdSlug(cmd), cmd] as const)),
    []
  );

  useEffect(() => {
    let cancelled = false;

    fetchCommandRankings(4, 6)
      .then((data) => {
        if (cancelled) return;
        const trendingCommands = data.trending
          .map((item) => commandMap.get(item.command))
          .filter((cmd): cmd is BotCommand => cmd !== undefined);
        const popularCommands = data.popular
          .map((item) => commandMap.get(item.command))
          .filter((cmd): cmd is BotCommand => cmd !== undefined);

        setTrending(trendingCommands.length ? trendingCommands : BOT_COMMANDS.slice(0, 4));
        setPopular(popularCommands.length ? popularCommands : BOT_COMMANDS.slice(0, 6));
        setDataLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTrending(BOT_COMMANDS.slice(0, 4));
        setPopular(BOT_COMMANDS.slice(0, 6));
        setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commandMap]);

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };

  const cats = getCategories();

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="pb-28 relative">
      <StickyHeader title={t('bot_commands')} subtitle={t('commands_available', { count: BOT_COMMANDS.length })} />

      {/* ── Trending (Carrusel) ── */}
      <motion.section variants={staggerItem} className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3 pl-1">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={16} className="text-orange-500" /> {t('trending')}
          </h2>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {dataLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-[140px] bg-tg-secondary/50 border border-tg-border/20 rounded-[20px] p-4 animate-pulse">
                  <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-text/10 mb-3" />
                  <div className="h-4 w-3/4 bg-tg-text/15 rounded-md mb-2" />
                  <div className="h-3 w-full bg-tg-text/10 rounded-md mb-1" />
                  <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
                </div>
              ))}
            </>
          ) : trending.map((cmd) => {
            const slug = cmdSlug(cmd!);
            const cat = CATEGORY_META[cmd!.category] ?? { label: cmd!.category, color: '#6b7280', icon: '📦' };
            const brand = getCategoryBrand(cmd!.category);
            
            return (
              <motion.button
                key={slug}
                whileTap={MOTION.tap}
                onClick={() => go(slug)}
                className="flex-shrink-0 w-[140px] bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-4 text-left transition-all duration-200 shadow-sm group relative overflow-hidden"
              >
                {/* Category glow */}
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-30 pointer-events-none" style={{ background: brand.glow }} />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div
                  className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-xl mb-3 shadow-sm border border-white/5 group-active:scale-95 transition-transform duration-200 relative z-10"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <span>
                    {typeof cat.icon === 'string' ? cat.icon : <cat.icon className="w-5 h-5" style={{ color: cat.color }} />}
                  </span>
                </div>
                <div className="text-[15px] font-bold text-tg-text font-mono leading-tight mb-1 truncate relative z-10">
                  /{slug}
                </div>
                <div className="text-[12px] font-medium text-tg-hint line-clamp-2 leading-snug relative z-10">
                  {cmd!.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ── Popular Commands ── */}
      <motion.section variants={staggerItem} className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3 pl-1">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Star size={16} className="text-amber-500 fill-amber-500/20" /> {t('popular_commands')}
          </h2>
        </div>
        
        <div className="flex flex-col gap-3">
          {dataLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="w-full bg-tg-secondary/50 border border-tg-border/20 rounded-[20px] p-4 flex items-start gap-3.5 animate-pulse">
                <div className="w-[42px] h-[42px] rounded-[14px] bg-tg-text/10 flex-shrink-0" />
                <div className="flex-1 pt-0.5 space-y-2">
                  <div className="h-4 w-1/3 bg-tg-text/15 rounded-md" />
                  <div className="h-3 w-2/3 bg-tg-text/10 rounded-md" />
                  <div className="h-5 w-16 bg-tg-text/8 rounded-full" />
                </div>
              </div>
            ))
          ) : popular.slice(0, 6).map((cmd) => (
            <CommandCard key={cmdSlug(cmd!)} cmd={cmd!} onClick={go} />
          ))}
        </div>
      </motion.section>

      {/* ── Categories (Grid) ── */}
      <motion.section variants={staggerItem} className="px-5 mt-8">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 flex items-center gap-1.5 mb-3">
          <Folder size={16} className="text-sky-500 fill-sky-500/20" /> {t('categories')}
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {cats.map((c) => {
            const meta = CATEGORY_META[c] ?? { label: c, color: '#6b7280', icon: '📦' };
            const count = BOT_COMMANDS.filter((cmd) => cmd.category === c).length;
            
            return (
              <motion.button
                key={c}
                whileTap={MOTION.tap}
                onClick={() => {
                  haptic?.impactOccurred('light');
                  navigate(`/users/ui/${userId}/bot-commands/list?cat=${c}`);
                }}
                className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-4 text-left transition-all duration-200 shadow-sm group relative overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: getCategoryBrand(c).glow }} />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
                <div
                  className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-xl mb-3 shadow-sm border border-white/5 group-active:scale-95 transition-transform duration-200 relative z-10"
                  style={{ backgroundColor: `${meta.color}20` }}
                >
                  <span>
                    {typeof meta.icon === 'string' ? meta.icon : <meta.icon className="w-5 h-5" style={{ color: meta.color }} />}
                  </span>
                </div>
                <div className="text-[15px] font-semibold text-tg-text truncate leading-tight relative z-10">
                  {meta.label}
                </div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5 relative z-10">
                  {count} {t('commands:title').toLowerCase()}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ── View All Button ── */}
      <motion.section variants={staggerItem} className="px-5 mt-8 pb-4">
        <motion.button
          whileTap={MOTION.tap}
          onClick={() => {
            haptic?.impactOccurred('light');
            navigate(`/users/ui/${userId}/bot-commands/list`);
          }}
          className="w-full py-3.5 rounded-[20px] bg-tg-accent/10 text-tg-accent text-[15px] font-semibold flex items-center justify-center gap-2 transition-transform duration-200 shadow-sm"
        >
          {t('explore_all')}
          <ArrowRight size={18} strokeWidth={2.5} />
        </motion.button>
      </motion.section>
      
    </motion.div>
  );
}