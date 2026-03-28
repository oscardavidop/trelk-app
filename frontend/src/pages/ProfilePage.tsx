import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore, useToastStore } from '../stores';
import { useFavoritesStore } from '../stores/favorites';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  Terminal,
  Image as ImageIcon,
  Sparkles,
  Calendar,
  User,
  DownloadCloud,
  Share2,
  LifeBuoy,
  Crown,
  ChevronRight,
  Copy,
  Pencil,
  Clock,
  Zap,
  Trophy,
  Flame,
  Shield,
  Star,
  Activity,
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import { staggerContainer, staggerItem, MOTION } from '../design';
import { fetchSubscription, type ProFeatures } from '@/services/subscriptionApi';
import { fetchActivityStats, type ActivityStats } from '@/services/historyApi';

/* ─── Animated count-up number ─── */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value <= 0) { setDisplayed(0); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplayed(start);
      if (start >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className}>{displayed}</span>;
}

/* ─── User level badge logic ─── */
function getUserBadge(commandsUsed: number, daysActive: number) {
  if (commandsUsed >= 100 || daysActive >= 60) return { key: 'power_user', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  if (commandsUsed >= 10 || daysActive >= 7) return { key: 'active_user', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  return { key: 'new_user', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
}

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const { user: tgUser, haptic, webApp } = useTelegram();
  const appUser = useUserStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { items, total, load: loadFavs } = useFavoritesStore();
  const [shareOpen, setShareOpen] = useState(false);

  const firstName = tgUser?.first_name || 'User';
  const lastName = tgUser?.last_name || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const username = tgUser?.username ? `@${tgUser.username}` : '';
  const photoUrl = tgUser?.photo_url;
  const tgId = appUser?.authTelegram?.id || appUser?.id;
  const isPremium = (tgUser as any)?.is_premium;

  // Calculate days since account creation
  const createdAt = (appUser as any)?.createdAt;
  const daysActive = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000) : 0;
  const memberDate = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  // Real activity stats from history API
  const { data: activityStats } = useQuery<ActivityStats>({
    queryKey: ['profile-activity-stats'],
    queryFn: fetchActivityStats,
    staleTime: 30_000,
  });
  const commandsUsed = activityStats?.commandsTotal ?? 0;

  const badge = getUserBadge(commandsUsed, daysActive);

  // Subscription data
  const { data: subData } = useQuery({
    queryKey: ['profile-subscription'],
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });
  const proFeatures = subData?.ok ? subData.pro_features : null;

  const go = useCallback((path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  }, [haptic, navigate, userId]);

  const copyId = useCallback(() => {
    if (!tgId) return;
    navigator.clipboard.writeText(String(tgId));
    haptic?.notificationOccurred('success');
    showToast(t('id_copied'), 'success');
  }, [tgId, haptic, showToast, t]);

  const favsCount = total || items.length || 0;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="pb-28 relative max-w-[480px] mx-auto overflow-x-hidden">

      {/* ── Profile Hero ── */}
      <motion.div variants={staggerItem} className="relative pt-8 pb-7 px-5 overflow-hidden">
        {/* Background gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-tg-accent/8 via-purple-500/4 to-transparent pointer-events-none" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-tg-accent/10 blur-3xl pointer-events-none animate-glow-pulse" />

        <div className="relative flex flex-col items-center">
          {/* Avatar */}
          <div className="relative" onContextMenu={(e) => e.preventDefault()}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
                className="w-[96px] h-[96px] rounded-full object-cover ring-[3px] ring-tg-bg shadow-lg z-10 relative select-none pointer-events-none"
              />
            ) : (
              <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-[36px] font-bold ring-[3px] ring-tg-bg shadow-lg z-10 relative">
                {firstName.charAt(0)}
              </div>
            )}
            <div className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-tg-accent/30 to-purple-500/30 blur-lg z-0 opacity-80" />
            <div className="absolute inset-0 z-30 rounded-full" onContextMenu={(e) => e.preventDefault()} />

            {/* Premium badge on avatar */}
            {isPremium && (
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-[3px] ring-tg-bg shadow-md z-20">
                <Crown size={15} className="text-white fill-white/30 drop-shadow-sm" />
              </div>
            )}

            {/* Edit button on avatar */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => go('/profile')}
              className="absolute top-0 right-0 w-7 h-7 rounded-full bg-tg-bg/90 border border-tg-border/50 flex items-center justify-center z-20 shadow-sm backdrop-blur-sm"
            >
              <Pencil size={12} className="text-tg-hint" />
            </motion.button>
          </div>

          {/* Name & username */}
          <h1 className="text-[24px] font-extrabold text-tg-text mt-4 leading-tight tracking-tight">{displayName}</h1>
          {username && <p className="text-[14px] font-medium text-tg-hint mt-0.5">{username}</p>}

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-3.5 flex-wrap justify-center">
            {/* ID copiable */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={copyId}
              className="flex items-center gap-1.5 text-[12px] font-mono font-medium text-tg-hint bg-tg-secondary border border-tg-border/40 pl-3 pr-2.5 py-1.5 rounded-full shadow-sm active:bg-tg-hint/10 transition-colors"
            >
              ID: {tgId}
              <Copy size={11} className="text-tg-hint/60" />
            </motion.button>

            {/* Dynamic badge */}
            <span className={`text-[11px] font-bold uppercase tracking-wider border px-3 py-1.5 rounded-full shadow-sm ${badge.color}`}>
              {t(badge.key)}
            </span>

            {/* Premium badge */}
            {isPremium && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                <Crown size={11} className="fill-amber-500/20" />
                Premium
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid (2x2) ── */}
      <motion.section variants={staggerItem} className="px-5 mt-1">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('favorites'), value: favsCount, icon: Heart, iconClass: 'text-pink-500 fill-pink-500/20', bgClass: 'bg-pink-500/10' },
            { label: t('commands_used'), value: commandsUsed, icon: Terminal, iconClass: 'text-sky-500', bgClass: 'bg-sky-500/10' },
            { label: t('images'), value: 0, icon: ImageIcon, iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
            { label: t('activity_time'), value: daysActive, icon: Clock, iconClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileTap={MOTION.tap}
              className="bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 rounded-[20px] p-4 flex flex-col items-center justify-center shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
              <div className={`w-10 h-10 rounded-[14px] ${s.bgClass} flex items-center justify-center mb-2.5`}>
                <s.icon size={20} className={s.iconClass} />
              </div>
              <div className="text-[22px] font-extrabold text-tg-text leading-none">
                <AnimatedNumber value={s.value} />
              </div>
              <div className="text-[11px] font-semibold text-tg-hint mt-1.5 uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Activity Timeline ── */}
      <motion.section variants={staggerItem} className="mt-7 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('activity')}</h2>
        <div className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 overflow-hidden shadow-sm">
          {favsCount > 0 || commandsUsed > 0 ? (
            <div className="flex flex-col">
              {[
                {
                  label: t('last_generation'),
                  time: t('recently'),
                  icon: <Sparkles size={18} className="text-purple-500" />,
                },
                {
                  label: t('last_favorite'),
                  time: items[0]?.createdAt
                    ? new Date(items[0].createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                    : '—',
                  icon: <Heart size={18} className="text-pink-500" />,
                },
                {
                  label: t('membership'),
                  time: daysActive > 0 ? t('member_days', { count: daysActive }) : memberDate,
                  icon: <Calendar size={18} className="text-emerald-500" />,
                },
              ].map((a) => (
                <div key={a.label} className="flex items-center gap-3.5 p-3.5 border-b border-tg-border/20 last:border-0">
                  <div className="w-[36px] h-[36px] rounded-[12px] bg-tg-hint/8 flex items-center justify-center flex-shrink-0">
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text leading-tight">{a.label}</div>
                  </div>
                  <span className="text-[13px] font-medium text-tg-hint">{a.time}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-[18px] bg-tg-hint/8 flex items-center justify-center mb-3">
                <Activity size={24} className="text-tg-hint/40" />
              </div>
              <p className="text-[14px] font-semibold text-tg-text">{t('no_activity_yet')}</p>
              <p className="text-[12px] text-tg-hint mt-1">{t('start_using')}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Insights / Your Stats ── */}
      <motion.section variants={staggerItem} className="mt-7 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('your_stats')}</h2>
        <div className="rounded-[20px] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 overflow-hidden shadow-sm p-4 space-y-4">
          {/* Usage streak */}
          <div className="flex items-center gap-3">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Flame size={18} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-tg-text">{t('usage_streak')}</div>
              <div className="text-[11px] text-tg-hint">{t('streak_days', { count: Math.min(daysActive, 5) })}</div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[6px] h-[18px] rounded-full ${i < Math.min(daysActive, 5) ? 'bg-orange-500' : 'bg-tg-border/30'}`}
                />
              ))}
            </div>
          </div>

          {/* Level / XP bar */}
          <div className="flex items-center gap-3">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold text-tg-text">{t('level')} {Math.floor(commandsUsed / 5) + 1}</span>
                <span className="text-[11px] text-tg-hint font-medium">{commandsUsed % 5}/5 XP</span>
              </div>
              <div className="h-[5px] rounded-full bg-tg-border/30 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((commandsUsed % 5) / 5) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Achievements preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-[13px] font-semibold text-tg-text">{t('achievements')}</span>
              </div>
              <button className="text-[11px] font-bold text-tg-accent uppercase tracking-wider">{t('view_all')}</button>
            </div>
            <div className="flex gap-2">
              {[
                { icon: Star, earned: favsCount > 0, label: 'First fav' },
                { icon: Terminal, earned: commandsUsed > 0, label: 'First cmd' },
                { icon: Flame, earned: daysActive >= 3, label: '3-day streak' },
              ].map((ach, i) => (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center p-2.5 rounded-[14px] border transition-all ${
                    ach.earned
                      ? 'bg-amber-500/8 border-amber-500/20'
                      : 'bg-tg-hint/5 border-tg-border/20 opacity-40'
                  }`}
                >
                  <ach.icon size={18} className={ach.earned ? 'text-amber-500' : 'text-tg-hint/40'} />
                  <span className="text-[9px] font-bold text-tg-hint mt-1 uppercase tracking-wider">{ach.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Premium Section ── */}
      <motion.section variants={staggerItem} className="mt-7 px-5">
        {proFeatures && proFeatures.subscription.tier !== 'free' ? (
          <motion.div
            whileTap={MOTION.tapLight}
            onClick={() => go('/subscription')}
            className="rounded-[20px] bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4 shadow-sm relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Crown size={20} className="text-white fill-white/20" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text">{t('premium_active')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">
                  {t('current_plan')}: <span className="text-amber-500 font-bold uppercase">{proFeatures.subscription.tier}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-amber-500/40 flex-shrink-0" />
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileTap={MOTION.tap}
            onClick={() => go('/subscription')}
            className="w-full rounded-[20px] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 p-4 shadow-sm relative overflow-hidden text-left"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-tg-accent/8 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-[14px] bg-tg-accent/10 flex items-center justify-center">
                <Shield size={20} className="text-tg-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text">{t('upgrade_premium')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('unlock_features')}</div>
              </div>
              <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
            </div>
          </motion.button>
        )}
      </motion.section>

      {/* ── Quick Actions Grid ── */}
      <motion.section variants={staggerItem} className="mt-7 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">{t('actions')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: t('edit_profile'),
              desc: t('edit_profile_desc'),
              icon: User,
              iconClass: 'text-tg-accent',
              bgClass: 'bg-tg-accent/10',
              action: () => go('/profile'),
            },
            {
              label: t('export_favorites'),
              desc: t('export_desc'),
              icon: DownloadCloud,
              iconClass: 'text-pink-500',
              bgClass: 'bg-pink-500/10',
              action: () => go('/favorites'),
            },
            {
              label: t('share_bot'),
              desc: t('share_bot_desc'),
              icon: Share2,
              iconClass: 'text-sky-500',
              bgClass: 'bg-sky-500/10',
              action: async () => {
                haptic?.impactOccurred('light');
                try {
                  await navigator.share({ title: 'Trelk Bot', text: t('share_text'), url: 'https://t.me/TrelkBot' });
                } catch { setShareOpen(true); }
              },
            },
            {
              label: t('support'),
              desc: t('support_desc'),
              icon: LifeBuoy,
              iconClass: 'text-emerald-500',
              bgClass: 'bg-emerald-500/10',
              action: () => {
                haptic?.impactOccurred('light');
                webApp?.openTelegramLink('https://t.me/TrelkSupportBot');
              },
            },
          ].map((item) => (
            <motion.button
              key={item.label}
              whileTap={MOTION.tap}
              onClick={item.action}
              className="bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 rounded-[20px] p-4 text-left shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/6 to-transparent" />
              <div className={`w-10 h-10 rounded-[14px] ${item.bgClass} flex items-center justify-center mb-3 group-active:scale-95 transition-transform`}>
                <item.icon size={20} className={item.iconClass} />
              </div>
              <div className="text-[14px] font-bold text-tg-text leading-tight">{item.label}</div>
              <div className="text-[11px] font-medium text-tg-hint mt-1 leading-snug">{item.desc}</div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </motion.div>
  );
}