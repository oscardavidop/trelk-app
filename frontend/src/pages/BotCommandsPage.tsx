import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { BOT_COMMANDS, cmdSlug, CATEGORY_META, getCategories } from '../data/botCommands';
import type { BotCommand } from '../data/botCommands';
import CommandCard from '../components/commands/CommandCard';
import StickyHeader from '../components/StickyHeader';
import { TrendingUp, Star, Folder, ArrowRight } from 'lucide-react';
import { fetchCommandRankings } from '../services/commandStatsApi';
import CommandFavoritesPage from './CommandFavoritesPage';

export default function BotCommandsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const [trending, setTrending] = useState<BotCommand[]>([]);
  const [popular, setPopular] = useState<BotCommand[]>([]);

  const commandMap = useMemo(
    () => new Map(BOT_COMMANDS.map((cmd) => [cmdSlug(cmd), cmd] as const)),
    [],
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
      })
      .catch(() => {
        if (cancelled) return;
        setTrending(BOT_COMMANDS.slice(0, 4));
        setPopular(BOT_COMMANDS.slice(0, 6));
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
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title={t('bot_commands')} subtitle={t('commands_available', { count: BOT_COMMANDS.length })} />

      {/* ── Trending (Carrusel) ── */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-bold text-tg-hint uppercase  pl-1 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-orange-500" /> {t('trending')}
          </h2>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {trending.map((cmd) => {
            const slug = cmdSlug(cmd!);
            const cat = CATEGORY_META[cmd!.category] ?? { label: cmd!.category, color: '#6b7280', icon: '📦' };
            
            return (
              <button
                key={slug}
                onClick={() => go(slug)}
                className="flex-shrink-0 w-[140px] bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 text-left active:scale-[0.96] transition-transform shadow-sm group hover:bg-white/[0.02]"
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center text-xl mb-3 shadow-inner"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <span className="group-hover:scale-110 transition-transform">
                    {typeof cat.icon === 'string' ? cat.icon : <cat.icon className="w-5 h-5" style={{ color: cat.color }} />}
                  </span>
                </div>
                <div className="text-[15px] font-extrabold text-tg-text font-mono  leading-none mb-1.5 truncate">
                  /{slug}
                </div>
                <div className="text-[11px] text-tg-hint/80 line-clamp-2 leading-tight">
                  {cmd!.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Popular Commands ── */}
      <section className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-bold text-tg-hint uppercase  pl-1 flex items-center gap-1.5">
            <Star size={14} className="text-amber-400 fill-amber-400/20" /> {t('popular_commands')}
          </h2>
        </div>
        
        {/* CORRECCIÓN: Volvemos a usar una lista con espacio (gap-3) 
            para que cada CommandCard sea una tarjeta independiente, sin "cajas dobles" */}
        <div className="flex flex-col gap-3">
          {popular.slice(0, 6).map((cmd) => (
            <CommandCard key={cmdSlug(cmd!)} cmd={cmd!} onClick={go} />
          ))}
        </div>
      </section>

      {/* ── Categories (Grid) ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  pl-1 flex items-center gap-1.5 mb-3">
          <Folder size={14} className="text-sky-400 fill-sky-400/20" /> {t('categories')}
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {cats.map((c) => {
            const meta = CATEGORY_META[c] ?? { label: c, color: '#6b7280', icon: '📦' };
            const count = BOT_COMMANDS.filter((cmd) => cmd.category === c).length;
            
            return (
              <button
                key={c}
                onClick={() => {
                  haptic?.impactOccurred('light');
                  navigate(`/users/ui/${userId}/bot-commands/list?cat=${c}`);
                }}
                className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 text-left active:scale-[0.96] transition-transform shadow-sm hover:bg-white/[0.02] group"
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center text-xl mb-2.5 shadow-inner"
                  style={{ backgroundColor: `${meta.color}20` }}
                >
                  <span className="group-hover:scale-110 transition-transform">
                    {typeof meta.icon === 'string' ? meta.icon : <meta.icon className="w-5 h-5" style={{ color: meta.color }} />}
                  </span>
                </div>
                <div className="text-[15px] font-bold text-tg-text  truncate">
                  {meta.label}
                </div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">
                  {count} {t('commands:title').toLowerCase()}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── View All Button ── */}
      <section className="px-5 mt-8 pb-2">
        <button
          onClick={() => {
            haptic?.impactOccurred('light');
            navigate(`/users/ui/${userId}/bot-commands/list`);
          }}
          className="w-full py-4 rounded-[16px] bg-tg-accent/10 border border-tg-accent/20 text-tg-accent text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-tg-accent/15 transition-all shadow-sm"
        >
          {t('explore_all')}
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </section>
      
    </div>
  );
}