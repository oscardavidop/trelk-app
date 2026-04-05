import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useFavoritesStore } from '../stores/favorites';
import { useGamificationStore } from '../stores/gamification';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fileUrl } from '../services/favoritesApi';
import { fetchLiveMetrics } from '../services/liveApi';
import { fetchRecommendations } from '../services/recommendationsApi';
import XPProgress from '../components/XPProgress';
import CommandShortcuts from '../components/commands/CommandShortcuts';
import RecentCommands from '../components/commands/RecentCommands';
import CommandUsageCounter from '../components/stats/CommandUsageCounter';
import ForYouSection from '../components/recommendations/ForYouSection';
import FeatureSpotlight from '../components/home/FeatureSpotlight';
import QuickLearn from '../components/home/QuickLearn';
import LiveActivitySection from '@/components/home/LiveActivitySection';
import { cmdSlug } from '../data/botCommands';
import { MOTION, staggerContainer, staggerItem } from '../design';
import {
  Heart,
  Terminal,
  Crown,
  Receipt,
  ChevronRight,
  Trophy,
  Compass,
  Clock,
  Image as ImageIcon,
  Zap,
  Sparkles,
  Search,
} from 'lucide-react';
import SearchOverlay from '../components/search/SearchOverlay';
import PersonalizationSection from '../components/home/PersonalizationSection';
import { useUserState } from '../hooks/useUserState';

export default function DashboardHome() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { user, haptic } = useTelegram();
  const { items, load: loadFavs } = useFavoritesStore();
  const { achievements, loaded, loadGamification } = useGamificationStore();
  const queryClient = useQueryClient();
  const [showGreeting, setShowGreeting] = useState(true);
  const [visibleHistorySection, setVisibleHistorySection] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isNewUser, isInactive, isPowerUser } = useUserState();

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

    // Aggressive prefetch — warm cache for sections below the fold
    queryClient.prefetchQuery({
      queryKey: ['live-metrics'],
      queryFn: fetchLiveMetrics,
      staleTime: 10_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['recommendations'],
      queryFn: () => fetchRecommendations(10),
      staleTime: 5 * 60_000,
    });

    const timer = setTimeout(() => setShowGreeting(true), 0);
    return () => clearTimeout(timer);
  }, [loadFavs, loaded, loadGamification, queryClient]);

  const recentFavs = items.slice(0, 5);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-18 relative overflow-x-hidden max-w-[480px] mx-auto"
    >
      {/* ═══════════════════════════════════════════════
          HERO ZONE
      ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" />
        {/* Greeting */}
        <motion.div
          variants={staggerItem}
          className={`px-4 pt-7 pb-2 z-10 relative transition-all duration-500 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover ring-[3px] ring-white/10 shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-tg-accent via-blue-500 to-purple-600 flex items-center justify-center text-white text-[22px] font-black shadow-lg ring-[3px] ring-white/10">
                  {firstName.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 z-30 rounded-2xl" onContextMenu={(e) => e.preventDefault()} />
              <motion.div
                // animate={{ scale: [1, 1.3, 1] }}
                // transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-[2.5px] border-tg-bg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <motion.h1
                // initial={{ opacity: 0, x: -10 }}
                // animate={{ opacity: 1, x: 0 }}
                // transition={{ delay: 0.2, duration: 0.4 }}
                className="text-[24px] font-black text-tg-text leading-none tracking-tight"
              >
                {t('greeting', { name: firstName })}
              </motion.h1>
              <motion.p
                // initial={{ opacity: 0 }}
                // animate={{ opacity: 1 }}
                // transition={{ delay: 0.35 }}
                className="text-[14px] text-tg-hint font-medium mt-1 flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-400" />
                {isNewUser
                  ? t('welcome_new')
                  : isInactive
                    ? t('welcome_back_missed')
                    : isPowerUser
                      ? t('welcome_power')
                      : t('welcome_back')}
              </motion.p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptic?.impactOccurred('light'); setSearchOpen(true); }}
              className="w-10 h-10 rounded-xl bg-tg-text/[0.06] flex items-center justify-center active:bg-tg-accent/10 transition-colors"
            >
              <Search size={20} className="text-tg-hint" />
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Card — hero glassmorphism */}
        <motion.div variants={staggerItem} className="px-4 mt-4">
          <CommandUsageCounter />
        </motion.div>

        {/* XP Bar */}
        <motion.div variants={staggerItem} className="px-6 mt-4 pb-4">
          <XPProgress compact />
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════
          QUICK ACCESS — Colorful gradient grid
      ═══════════════════════════════════════════════ */}
      <motion.section variants={staggerItem} className="mt-6 px-4">
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { id: 'favorites', path: '/favorites', icon: Heart, gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/25', label: t('favorites') },
            { id: 'commands', path: '/premium', icon: Terminal, gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/25', label: t('commands') },
            { id: 'subscription', path: '/subscription', icon: Crown, gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/25', label: t('subscription') },
            { id: 'payments', path: '/payments', icon: Receipt, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/25', label: t('payments') },
          ].map((item, i) => (
            <motion.button
              key={item.id}
              whileTap={MOTION.tap}
              onClick={() => go(item.path)}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-2 py-3.5 rounded-[18px] bg-tg-secondary/80 backdrop-blur-sm border border-tg-border/15 active:scale-90 transition-transform"
            >
              <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.glow}`}>
                <item.icon size={20} className="text-white drop-shadow-sm" />
              </div>
              <span className="text-[11px] font-bold text-tg-text leading-tight">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════
          COMMAND SHORTCUTS — Horizontal scroll
      ═══════════════════════════════════════════════ */}
      {/* <motion.section variants={staggerItem} className="mt-7">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" />
            {t('quick_actions')}
          </h2>
          <button onClick={() => go('/bot-commands')} className="text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity">
            {t('view_catalog')}
          </button>
        </div>
        <CommandShortcuts onRun={(cmd) => go(`/bot-commands/${cmdSlug(cmd)}`)} />
      </motion.section> */}

      {/* ═══════════════════════════════════════════════
          ACHIEVEMENTS + DISCOVER — Visual row
      ═══════════════════════════════════════════════ */}
      <motion.div variants={staggerItem} className="px-4 mt-6">
        <div className="flex gap-2.5">
          <motion.button
            whileTap={MOTION.tap}
            onClick={() => go('/achievements')}
            className="flex-1 relative overflow-hidden rounded-[18px] bg-tg-secondary border border-tg-border/20 p-3.5 text-left"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            <div className="relative flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
                <Trophy size={19} className="text-white drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-black text-tg-text leading-none">{unlockedCount}/{achievements.length}</div>
                <div className="text-[11px] font-semibold text-tg-hint mt-0.5 truncate">{t('achievements_count', { count: unlockedCount })}</div>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={MOTION.tap}
            onClick={() => go('/discover')}
            className="flex-1 relative overflow-hidden rounded-[18px] bg-tg-secondary border border-tg-border/20 p-3.5 text-left"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl pointer-events-none" />
            <div className="relative flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20 flex-shrink-0">
                <Compass size={19} className="text-white drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-black text-tg-text leading-none truncate">{t('discover')}</div>
                <div className="text-[11px] font-semibold text-tg-hint mt-0.5 truncate">{t('explore_more')}</div>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          RECENT COMMANDS
      ═══════════════════════════════════════════════ */}
      {visibleHistorySection && (
        <motion.section variants={staggerItem} className="mt-6">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} /> {t('recent')}
            </h2>
            <button onClick={() => go('/activity')} className="text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity">
              {t('view_history')}
            </button>
          </div>
          <div className="px-4">
            <RecentCommands
              setVisible={setVisibleHistorySection}
              onTap={(cmd) => {
                const slug = cmd.replace('/', '');
                go(`/bot-commands/${slug}`);
              }}
            />
          </div>
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════
          FAVORITES PREVIEW — Visual gallery
      ═══════════════════════════════════════════════ */}
      {recentFavs.length > 0 && (
        <motion.section variants={staggerItem} className="mt-6 mb-2">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={13} className="text-rose-400" /> {t('your_favorites')}
            </h2>
            <button onClick={() => go('/favorites')} className="text-[13px] font-semibold text-tg-accent active:opacity-70 transition-opacity flex items-center gap-0.5">
              {t('common:view_gallery')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav, i) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.data.photo) ? fileUrl(fav.data.photo[0].file_id) : null;
              return (
                <motion.button
                  key={fav._id}
                  whileTap={MOTION.tap}
                  onClick={() => go('/favorites')}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex-shrink-0 relative group overflow-hidden rounded-[18px] border border-white/10 bg-tg-secondary w-[88px] h-[88px] shadow-md"
                >
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-active:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-tg-secondary to-tg-bg">
                      <ImageIcon size={22} className="text-tg-hint/25" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════
          LIVE ACTIVITY
      ═══════════════════════════════════════════════ */}
      <motion.div variants={staggerItem} className="mt-6">
        <LiveActivitySection />
      </motion.div>


      {/* ═══════════════════════════════════════════════
          FOR YOU
      ═══════════════════════════════════════════════ */}
      <motion.div variants={staggerItem} className="mt-6">
        <ForYouSection />
      </motion.div>


      {/* ═══════════════════════════════════════════════
          BOTTOM CONTENT — Spotlight + Tip
      ═══════════════════════════════════════════════ */}
      <motion.div variants={staggerItem} className="mt-6">
        <FeatureSpotlight />
      </motion.div>

      {/* ═══════════════════════════════════════════════
          PERSONALIZATION — AI-powered sections
      ═══════════════════════════════════════════════ */}
      <motion.div variants={staggerItem} className="mt-6">
        <PersonalizationSection />
      </motion.div>

      <motion.div variants={staggerItem} className="mt-6 mb-4">
        <QuickLearn />
      </motion.div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </motion.div>
  );
}