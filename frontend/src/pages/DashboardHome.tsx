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
import ForYouSection from '../components/recommendations/ForYouSection';
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
  Image as ImageIcon
} from 'lucide-react';

export default function DashboardHome() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { user, haptic } = useTelegram();
  const { items, load: loadFavs, loading: favsLoading } = useFavoritesStore();
  const { achievements, loaded, loadGamification } = useGamificationStore();
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
      className="pb-28 relative overflow-x-hidden max-w-[480px] mx-auto"
    >

      {/* -- Greeting -- */}
      <motion.div
        variants={staggerItem}
        className={`px-5 sticky top-0 pt-6 pb-4 z-10 transition-all duration-500 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} flex justify-between items-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-tg-bg/80 backdrop-blur-lg" />
        <div className="relative z-10 flex items-center gap-3.5">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-11 h-11 rounded-full ring-[2px] ring-tg-border object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-[18px] font-bold">
              {firstName.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 z-30 rounded-full" onContextMenu={(e) => e.preventDefault()} />
          <div className="flex flex-col justify-center">
            <h1 className="text-[20px] font-bold text-tg-text leading-tight tracking-tight">
              {t('greeting', { name: firstName })}
            </h1>
            <p className="text-[13px] text-tg-hint font-medium leading-tight">
              {t('welcome_back')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* -- Usage Counter -- */}
      <motion.div variants={staggerItem} className="px-5 mt-1">
        <CommandUsageCounter />
      </motion.div>

      {/* -- XP inline -- */}
      <motion.div variants={staggerItem} className="px-6 mt-4">
        <XPProgress compact />
      </motion.div>

      {/* -- Quick Access Grid -- */}
      <motion.section variants={staggerItem} className="mt-5 px-5">
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'favorites', path: '/favorites', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', label: t('favorites') },
            { id: 'commands', path: '/premium', icon: Terminal, color: 'text-blue-500', bg: 'bg-blue-500/10', label: t('commands') },
            { id: 'subscription', path: '/subscription', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', label: t('subscription') },
            { id: 'payments', path: '/payments', icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: t('payments') },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileTap={MOTION.tap}
              onClick={() => go(item.path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-[16px] bg-tg-secondary border border-tg-border/20 active:scale-95 transition-transform"
            >
              <div className={`w-10 h-10 rounded-[14px] ${item.bg} flex items-center justify-center`}>
                <item.icon size={20} className={item.color} />
              </div>
              <span className="text-[11px] font-semibold text-tg-text leading-tight">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* -- Shortcuts -- */}
      <motion.section variants={staggerItem} className="mt-6">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider">{t('quick_actions')}</h2>
          <button onClick={() => go('/bot-commands')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('view_catalog')}
          </button>
        </div>
        <CommandShortcuts onRun={(cmd) => go(`/bot-commands/${cmdSlug(cmd)}`)} />
      </motion.section>

      {/* -- Achievements + Discover (compact row) -- */}
      <motion.div variants={staggerItem} className="px-5 mt-6">
        <div className="flex gap-2">
          <motion.button whileTap={MOTION.tap} onClick={() => go('/achievements')} className="flex-1 flex items-center gap-2.5 p-3 rounded-[16px] bg-tg-secondary border border-tg-border/20 text-left">
            <div className="w-9 h-9 rounded-[12px] bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy size={18} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-tg-text truncate">{unlockedCount}/{achievements.length}</div>
              <div className="text-[11px] text-tg-hint truncate">{t('achievements_count', { count: unlockedCount })}</div>
            </div>
          </motion.button>

          <motion.button whileTap={MOTION.tap} onClick={() => go('/discover')} className="flex-1 flex items-center gap-2.5 p-3 rounded-[16px] bg-tg-secondary border border-tg-border/20 text-left">
            <div className="w-9 h-9 rounded-[12px] bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Compass size={18} className="text-violet-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-tg-text truncate">{t('discover')}</div>
              <div className="text-[11px] text-tg-hint truncate">{t('explore_more')}</div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* -- Recent Commands -- */}
      {visibleHistorySection && (
        <motion.section variants={staggerItem} className="mt-6">
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
      )}

      {/* -- For You -- */}
      <motion.div variants={staggerItem}>
        <ForYouSection />
      </motion.div>

      {/* -- Favorites Preview -- */}
      {recentFavs.length > 0 && (
        <motion.section variants={staggerItem} className="mt-6 mb-2">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={14} /> {t('your_favorites')}
            </h2>
            <button onClick={() => go('/favorites')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity flex items-center gap-0.5">
              {t('common:view_gallery')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.data.photo) ? fileUrl(fav.data.photo[0].file_id) : null;
              return (
                <motion.button
                  key={fav._id}
                  whileTap={MOTION.tap}
                  onClick={() => go('/favorites')}
                  className="flex-shrink-0 relative group overflow-hidden rounded-[16px] border border-tg-border/20 bg-tg-secondary w-[90px] h-[90px]"
                >
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={20} className="text-tg-hint/30" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}