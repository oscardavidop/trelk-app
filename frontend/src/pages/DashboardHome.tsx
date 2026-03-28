import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useFavoritesStore } from '../stores/favorites';
import { useGamificationStore } from '../stores/gamification';
import { useEffect, useState } from 'react';
import { fileUrl } from '../services/favoritesApi';
import XPProgress from '../components/XPProgress';
import CommandShortcuts from '../components/commands/CommandShortcuts';
import RecentCommands from '../components/commands/RecentCommands';
import CommandUsageCounter from '../components/stats/CommandUsageCounter';
import StatusBanner from '../components/status/StatusBanner';
import ThisWeekCard from '../components/stats/ThisWeekCard';
import ForYouSection from '../components/recommendations/ForYouSection';
import { cmdSlug } from '../data/botCommands';
import { MOTION, staggerContainer, staggerItem } from '../design';
import {
  Heart,
  Terminal,
  Crown,
  Receipt,
  ChevronRight,
  Sparkles,
  Trophy,
  Compass,
  Clock,
  Image as ImageIcon,
  Star
} from 'lucide-react';

export default function DashboardHome() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { user, haptic } = useTelegram();
  const { items, load: loadFavs, loading: favsLoading } = useFavoritesStore();
  const { xp, streak, achievements, loaded, loadGamification } = useGamificationStore();
  const [showGreeting, setShowGreeting] = useState(false);
  const [visibleHistorySection, setVisibleHistorySection] = useState(true);

  const firstName = user?.first_name || 'User';
  const photoUrl = user?.photo_url;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  useEffect(() => {
    loadFavs({
      filters: {
        projections: ['data.photo', 'data.media_type'],
      },
    });
    if (!loaded) loadGamification();
    const timer = setTimeout(() => setShowGreeting(true), 150);
    return () => clearTimeout(timer);
  }, [loadFavs, loaded, loadGamification]);

  const recentFavs = items.slice(0, 6);

  // Wrapper para navegación con Haptic Feedback (estilo nativo)
  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-28 relative overflow-x-hidden max-w-[480px] mx-auto"
    >

      {/* -- Greeting Hero -- */}
      <motion.div
        variants={staggerItem}
        className={`px-5 sticky top-0 pt-6 pb-4 z-10 transition-all duration-500 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} flex justify-between items-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-tg-bg/80 backdrop-blur-lg" />
        <div className="absolute inset-0 bg-gradient-to-br from-tg-accent/5 to-purple-500/3" />
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-tg-accent/8 blur-3xl animate-glow-pulse" />

        <div className="relative z-10 flex items-center gap-3.5">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-12 h-12 rounded-full ring-[2px] ring-tg-border object-cover shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-[20px] font-bold shadow-sm">
              {firstName.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 z-30 rounded-full" onContextMenu={(e) => e.preventDefault()} />

          <div className="flex flex-col justify-center">
            <h1 className="text-[22px] font-bold text-tg-text leading-tight tracking-tight">
              {t('greeting', { name: firstName })}
            </h1>
            <p className="text-[14px] text-tg-hint font-medium leading-tight">
              {t('welcome_back')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* -- Bot Status Banner -- */}
      <motion.div variants={staggerItem} className="px-5 mt-2">
        <StatusBanner />
      </motion.div>

      {/* -- Global Usage Counter -- */}
      <motion.div variants={staggerItem} className="px-5 mt-2">
        <CommandUsageCounter />
      </motion.div>

      {/* -- Mini XP Card -- */}
      <motion.div variants={staggerItem} className="px-7 mt-5 mb-2">
        <XPProgress compact />
      </motion.div>

      {/* -- This Week Recap -- */}
      <motion.div variants={staggerItem}>
        <ThisWeekCard />
      </motion.div>

      {/* -- Bento Grid (Quick Access) -- */}
      <motion.section variants={staggerItem} className="mt-6 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-3 px-1">
          {t('control_panel')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'favorites', path: '/favorites', icon: Heart, colors: 'from-rose-400 to-pink-500', title: t('favorites'), sub: t('your_gallery') },
            { id: 'commands', path: '/premium', icon: Terminal, colors: 'from-blue-400 to-tg-accent', title: t('commands'), sub: t('custom') },
            { id: 'subscription', path: '/subscription', icon: Crown, colors: 'from-amber-400 to-orange-500', title: t('subscription'), sub: t('manage_plan') },
            { id: 'payments', path: '/payments', icon: Receipt, colors: 'from-emerald-400 to-teal-500', title: t('payments'), sub: t('view_history') },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileTap={MOTION.tap}
              whileHover={MOTION.hover}
              onClick={() => go(item.path)}
              className="relative flex items-center gap-3 p-3.5 rounded-[24px] bg-tg-secondary border border-tg-border/30 text-left overflow-hidden shadow-sm group"
            >
              {/* Background glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.colors} opacity-[0.04] transition-opacity group-hover:opacity-[0.08]`} />
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />

              <div className={`relative z-10 w-[42px] h-[42px] rounded-[16px] bg-gradient-to-br ${item.colors} flex items-center justify-center flex-shrink-0 shadow-inner group-active:scale-95 transition-transform duration-200`}>
                <item.icon size={20} className="text-white drop-shadow-sm" />
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-tg-text truncate leading-tight">{item.title}</div>
                <div className="text-[12px] text-tg-hint truncate mt-0.5">{item.sub}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* -- Quick Actions (Shortcuts) -- */}
      <motion.section variants={staggerItem} className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider">{t('quick_actions')}</h2>
          <button onClick={() => go('/bot-commands')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('view_catalog')}
          </button>
        </div>
        <CommandShortcuts onRun={(cmd) => go(`/bot-commands/${cmdSlug(cmd)}`)} />
      </motion.section>

      {/* -- Gamification Strip -- */}
      <motion.div variants={staggerItem} className="px-5 mt-8">
        <div className="grid grid-cols-2 gap-3">
          <motion.button whileTap={MOTION.tap} onClick={() => go('/achievements')} className="relative flex items-center gap-3 p-4 rounded-[24px] bg-tg-secondary border border-tg-border/30 text-left overflow-hidden shadow-sm group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="relative z-10 w-[42px] h-[42px] rounded-[16px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <Trophy size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-semibold text-tg-text truncate">{t('achievements_count', { count: unlockedCount })}</div>
              <div className="text-[12px] text-tg-hint truncate mt-0.5">{t('remaining_count', { count: achievements.length - unlockedCount })}</div>
            </div>
          </motion.button>

          <motion.button whileTap={MOTION.tap} onClick={() => go('/discover')} className="relative flex items-center gap-3 p-4 rounded-[24px] bg-tg-secondary border border-tg-border/30 text-left overflow-hidden shadow-sm group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="relative z-10 w-[42px] h-[42px] rounded-[16px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <Compass size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-semibold text-tg-text truncate">{t('discover')}</div>
              <div className="text-[12px] text-tg-hint truncate mt-0.5">{t('explore_more')}</div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* -- Recent Commands -- */}
      {
        visibleHistorySection && (
          <motion.section variants={staggerItem} className="mt-8">
            <div className="flex items-center justify-between px-6 mb-3">
              <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> {t('recent')}
              </h2>
              <button onClick={() => go('/activity')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
                {t('view_history')}
              </button>
            </div>
            <div className="px-5">
              <RecentCommands
                setVisible={setVisibleHistorySection}
                onTap={(cmd) => {
                  const slug = cmd.replace('/', '');
                  go(`/bot-commands/${slug}`);
                }} />
            </div>
          </motion.section>
        )
      }

      {/* -- For You Recommendations -- */}
      <motion.div variants={staggerItem}>
        <ForYouSection />
      </motion.div>

      {/* -- Favorites Carousel -- */}
      <motion.section variants={staggerItem} className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={14} /> {t('your_favorites')}
          </h2>
          <button onClick={() => go('/favorites')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('common:view_gallery')}
          </button>
        </div>

        {favsLoading && recentFavs.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-4 mx-5 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[110px] h-[110px] flex-shrink-0 rounded-[24px] bg-tg-secondary border border-tg-border/30 shadow-sm flex items-center justify-center relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-tg-hint/20 animate-pulse" />
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              </div>
            ))}
          </div>
        ) : recentFavs.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-4 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.data.photo) ? fileUrl(fav.data.photo[0].file_id) : null;
              return (
                <motion.button
                  key={fav._id}
                  whileTap={MOTION.tap}
                  onClick={() => go('/favorites')}
                  className="flex-shrink-0 relative group overflow-hidden rounded-[24px] shadow-sm border border-tg-border/30 bg-tg-secondary w-[110px] h-[110px]"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-black/5 dark:bg-white/5">
                      <ImageIcon size={24} className="text-tg-hint/40 mb-2" />
                      <span className="text-[11px] font-medium text-tg-hint leading-snug line-clamp-2 w-full break-words">
                        {fav.data?.caption || fav.context || t('no_title')}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="mx-5 p-6 rounded-[24px] bg-tg-secondary/70 backdrop-blur-sm border border-tg-border/30 text-center shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-tg-accent/5 blur-2xl" />
            <Star size={28} className="text-tg-hint/40 mb-3" />
            <h3 className="text-[15px] font-semibold text-tg-text mb-1">No favorites yet</h3>
            <p className="text-[13px] text-tg-hint mb-4">Start saving your favorite commands.</p>
            <motion.button
              whileTap={MOTION.tap}
              onClick={() => go('/favorites')}
              className="px-5 py-2 rounded-[12px] bg-tg-accent/10 text-tg-accent font-medium text-[14px] transition-all"
            >
              Explore Commands
            </motion.button>
          </div>
        )}
      </motion.section>

      {/* -- Inspiration Card (Glassmorphism) -- */}
      <motion.section variants={staggerItem} className="mt-6 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-3">{t('inspiration_day')}</h2>
        <motion.button
          whileTap={MOTION.tap}
          onClick={() => go('/favorites/inspiration')}
          className="w-full relative overflow-hidden rounded-[28px] shadow-md group text-left block"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
          {/* Glow orbs */}
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-purple-400/20 blur-3xl animate-glow-pulse" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-orange-400/15 blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />

          <div className="relative p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-300" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  {t('featured_prompt')}
                </span>
              </div>
              <p className="text-[16px] text-white leading-relaxed font-medium drop-shadow-sm">
                "A dreamy landscape with floating islands at sunset, digital art masterpiece"
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-white font-bold text-[13px] bg-white/10 border border-white/20 w-max px-4 py-2 rounded-[12px] backdrop-blur-lg group-active:bg-white/20 transition-colors">
              <span>{t('explore_gallery')}</span>
              <ChevronRight size={16} strokeWidth={2.5} />
            </div>
          </div>
        </motion.button>
      </motion.section>

    </motion.div>
  );
}