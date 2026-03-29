import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug, findCommand } from '../data/botCommands';
import type { BotCommand } from '../data/botCommands';
import {
  Search, Sparkles, Eye, Zap, Compass, Gem, ChevronRight, Users,
} from 'lucide-react';
import { getCategoryBrand, MOTION, staggerContainer, staggerItem } from '../design';
import { getDiscoverData } from '../data/discoverMock';
import type { DiscoverCommand } from '../data/discoverMock';

export default function DiscoverPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('discover');
  const { haptic } = useTelegram();

  const data = useMemo(() => getDiscoverData(), []);

  const base = `/users/ui/${userId}`;
  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`${base}/bot-commands/${slug}`);
  };
  const goList = (cat?: string) => {
    haptic?.impactOccurred('light');
    navigate(`${base}/bot-commands/list${cat ? `?cat=${cat}` : ''}`);
  };

  const resolve = (slug: string): BotCommand | undefined => findCommand(slug);

  /* ── Mini card used in horizontal scrolls ── */
  const MiniCard = ({ item, index }: { item: DiscoverCommand; index: number }) => {
    const cmd = resolve(item.slug);
    if (!cmd) return null;
    const cat = CATEGORY_META[cmd.category];
    const brand = getCategoryBrand(cmd.category);

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.04, duration: 0.2 }}
        whileTap={MOTION.tap}
        onClick={() => go(item.slug)}
        className="flex-shrink-0 w-[152px] relative bg-tg-secondary border border-tg-border/30 rounded-[20px] p-3.5 text-left overflow-hidden group"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${brand.gradient} opacity-[0.05] group-active:opacity-[0.12] transition-opacity`} />
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-15" style={{ background: brand.glow }} />

        <div className="relative z-10">
          <div className="text-[15px] font-extrabold text-tg-text font-mono">/{item.slug}</div>
          <div className="text-[11px] font-medium text-tg-hint leading-snug line-clamp-2 mt-1 min-h-[28px]">
            {cmd.description}
          </div>

          {item.badge && (
            <span
              className="inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full"
              style={{
                color: cat?.color,
                backgroundColor: `${cat?.color}12`,
                border: `1px solid ${cat?.color}25`,
              }}
            >
              {item.badge}
            </span>
          )}

          {item.reason && (
            <p className="text-[10px] text-tg-accent/70 mt-1.5 leading-tight truncate">
              {t(item.reason, { defaultValue: item.reason })}
            </p>
          )}
        </div>
      </motion.button>
    );
  };

  /* ── Horizontal scroll strip ── */
  const HScroll = ({ children }: { children: React.ReactNode }) => (
    <div
      className="flex gap-2.5 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {children}
    </div>
  );

  /* ── Section header ── */
  const SectionHead = ({
    icon: Icon,
    iconClass,
    title,
  }: {
    icon: typeof Sparkles;
    iconClass: string;
    title: string;
  }) => (
    <div className="flex items-center gap-2 px-5 mb-2.5">
      <Icon size={14} className={iconClass} />
      <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wide">{title}</h2>
    </div>
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-24 relative"
    >
      {/* ═══ HERO ═══ */}
      <motion.div variants={staggerItem} className="relative px-5 pt-8 pb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tg-accent/8 via-violet-500/6 to-transparent" />
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-tg-accent/8 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-violet-500/6 blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-[24px] font-extrabold text-tg-text leading-tight">
            {t('hero_title')}
          </h1>
          <p className="text-[13px] font-medium text-tg-hint/70 mt-1.5">
            {t('hero_subtitle')}
          </p>
        </div>
      </motion.div>

      {/* ═══ SEARCH ═══ */}
      <motion.div variants={staggerItem} className="px-5 mb-5">
        <motion.button
          whileTap={MOTION.tapLight}
          onClick={() => goList()}
          className="w-full flex items-center gap-3 bg-tg-secondary/60 backdrop-blur-xl rounded-[14px] border border-tg-border/30 px-4 py-3 transition-colors"
        >
          <Search size={16} className="text-tg-hint/40" />
          <span className="text-[13px] font-medium text-tg-hint/60">{t('search_placeholder')}</span>
        </motion.button>
      </motion.div>

      {/* ═══ 1. FOR YOU ═══ */}
      <motion.section variants={staggerItem} className="mt-1">
        <SectionHead icon={Sparkles} iconClass="text-violet-400" title={t('for_you')} />
        <HScroll>
          {data.forYou.map((item, i) => (
            <MiniCard key={item.slug} item={item} index={i} />
          ))}
        </HScroll>
      </motion.section>

      {/* ═══ 2. BECAUSE YOU USED ═══ */}
      <motion.section variants={staggerItem} className="mt-6">
        <div className="flex items-center gap-2 px-5 mb-2.5">
          <Compass size={14} className="text-sky-400" />
          <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wide">
            {t('because_used', { command: data.becauseUsed.trigger })}
          </h2>
        </div>
        <HScroll>
          {data.becauseUsed.commands.map((item, i) => (
            <MiniCard key={item.slug} item={item} index={i} />
          ))}
        </HScroll>
      </motion.section>

      {/* ═══ 3. TRY SOMETHING NEW ═══ */}
      <motion.section variants={staggerItem} className="mt-6">
        <SectionHead icon={Zap} iconClass="text-amber-400" title={t('try_new')} />
        <HScroll>
          {data.tryNew.map((item, i) => (
            <MiniCard key={item.slug} item={item} index={i} />
          ))}
        </HScroll>
      </motion.section>

      {/* ═══ 4. HIDDEN GEMS ═══ */}
      <motion.section variants={staggerItem} className="mt-6">
        <SectionHead icon={Gem} iconClass="text-emerald-400" title={t('hidden_gems')} />
        <HScroll>
          {data.hiddenGems.map((item, i) => (
            <MiniCard key={item.slug} item={item} index={i} />
          ))}
        </HScroll>
      </motion.section>

      {/* ═══ 5. LIVE NOW ═══ */}
      <motion.section variants={staggerItem} className="mt-6">
        <SectionHead icon={Users} iconClass="text-rose-400" title={t('live_now')} />
        <div className="px-5 space-y-2">
          {data.liveNow.map((item) => {
            const cmd = resolve(item.slug);
            if (!cmd) return null;
            return (
              <motion.button
                key={item.slug}
                whileTap={MOTION.tapLight}
                onClick={() => go(item.slug)}
                className="w-full flex items-center gap-3 bg-tg-secondary/70 border border-tg-border/20 rounded-[14px] px-3.5 py-2.5 text-left group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-bold text-tg-text font-mono">/{item.slug}</span>
                  <span className="text-[11px] text-tg-hint ml-2 truncate">{cmd.description}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Eye size={12} className="text-tg-hint/50" />
                  <span className="text-[11px] font-bold text-tg-hint/60">
                    {item.liveUsers}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ═══ 6. QUICK ACTIONS ═══ */}
      <motion.section variants={staggerItem} className="mt-7">
        <SectionHead icon={Zap} iconClass="text-tg-accent" title={t('quick_actions')} />
        <div className="flex flex-wrap gap-2 px-5">
          {data.quickActions.map((slug) => (
            <motion.button
              key={slug}
              whileTap={MOTION.tap}
              onClick={() => go(slug)}
              className="px-3.5 py-2 rounded-full bg-tg-accent/10 border border-tg-accent/20 text-[13px] font-bold text-tg-accent font-mono active:scale-95 transition-transform"
            >
              /{slug}
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ═══ 7. EXPLORE BY INTENT ═══ */}
      <motion.section variants={staggerItem} className="mt-7 px-5">
        <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wide mb-3">
          {t('explore_intent')}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {data.intents.map((intent) => {
            const meta = CATEGORY_META[intent.category];
            const brand = getCategoryBrand(intent.category);

            return (
              <motion.button
                key={intent.key}
                whileTap={MOTION.tap}
                onClick={() => goList(intent.category)}
                className="relative flex items-center gap-3 bg-tg-secondary border border-tg-border/20 rounded-[16px] p-3 text-left overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${brand.gradient} opacity-[0.04] group-active:opacity-[0.1] transition-opacity`} />
                <span className="text-[20px] relative z-10">{intent.emoji}</span>
                <span className="text-[13px] font-semibold text-tg-text relative z-10 truncate">
                  {t(intent.labelKey, { defaultValue: meta?.label || intent.key })}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ═══ BROWSE ALL ═══ */}
      <motion.div variants={staggerItem} className="px-5 mt-8 pb-4">
        <motion.button
          whileTap={MOTION.tap}
          onClick={() => goList()}
          className="w-full py-3.5 rounded-[14px] bg-tg-accent/10 border border-tg-accent/20 text-tg-accent text-[14px] font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          {t('browse_all')}
          <ChevronRight size={16} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}