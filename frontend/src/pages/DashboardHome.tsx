import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useFavoritesStore } from '../stores/favorites';
import { useGamificationStore } from '../stores/gamification';
import { useEffect, useState } from 'react';
import { fileUrl } from '../services/favoritesApi';
import XPProgress from '../components/XPProgress';
import CommandShortcuts from '../components/commands/CommandShortcuts';
import RecentCommands from '../components/commands/RecentCommands';
import CommandUsageCounter from '../components/stats/CommandUsageCounter';
import { cmdSlug } from '../data/botCommands';
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
    <div className="pb-28 animate-fade-in relative overflow-x-hidden max-w-[480px] mx-auto">

      {/* ── Saludo Hero ── */}
      <div className={`px-5 sticky top-0 pt-6 pb-4 bg-tg-bg/80 backdrop-blur-lg z-10 transition-all duration-500 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} flex justify-between items-center`}>
        <div className="flex items-center gap-3.5">
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
      </div>

      {/* ── Global Usage Counter ── */}
      <div className="px-5 mt-2">
        <CommandUsageCounter />
      </div>

      {/* ── Mini Tarjeta XP + Racha ── */}
      <div className="px-7 mt-5 mb-2">
        <XPProgress compact />
      </div>

      {/* ── Grid de Accesos Directos (Bento Grid) ── */}
      <section className="mt-6 px-5">
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
            <button
              key={item.id}
              onClick={() => go(item.path)}
              className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/40 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm group"
            >
              <div className={`w-[42px] h-[42px] rounded-2xl bg-gradient-to-br ${item.colors} flex items-center justify-center flex-shrink-0 shadow-inner group-active:scale-95 transition-transform duration-200`}>
                <item.icon size={20} className="text-white drop-shadow-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-tg-text truncate leading-tight">{item.title}</div>
                <div className="text-[12px] text-tg-hint truncate mt-0.5">{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Acciones Rápidas (Shortcuts) ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider">{t('quick_actions')}</h2>
          <button onClick={() => go('/bot-commands')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('view_catalog')}
          </button>
        </div>
        <CommandShortcuts onRun={(cmd) => go(`/bot-commands/${cmdSlug(cmd)}`)} />
      </section>

      {/* ── Franja de Gamificación ── */}
      <div className="px-5 mt-8">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => go('/achievements')} className="relative flex items-center gap-3 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/40 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm group overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-[42px] h-[42px] rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <Trophy size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-semibold text-tg-text truncate">{t('achievements_count', { count: unlockedCount })}</div>
              <div className="text-[12px] text-tg-hint truncate mt-0.5">{t('remaining_count', { count: achievements.length - unlockedCount })}</div>
            </div>
          </button>

          <button onClick={() => go('/discover')} className="relative flex items-center gap-3 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/40 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm group overflow-hidden">
            <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-[42px] h-[42px] rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <Compass size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-semibold text-tg-text truncate">{t('discover')}</div>
              <div className="text-[12px] text-tg-hint truncate mt-0.5">{t('explore_more')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Comandos Usados Recientemente ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} /> {t('recent')}
          </h2>
          <button onClick={() => go('/activity')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('view_history')}
          </button>
        </div>
        <div className="px-5">
          <RecentCommands onTap={(cmd) => {
            const slug = cmd.replace('/', '');
            go(`/bot-commands/${slug}`);
          }} />
        </div>
      </section>

      {/* ── Favoritos Recientes (Carrusel) ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={14} /> {t('your_favorites')}
          </h2>
          <button onClick={() => go('/favorites')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('common:view_gallery')}
          </button>
        </div>

        {favsLoading && recentFavs.length === 0 ? (
          /* Skeleton Profesional estilo Telegram */
          <div className="flex gap-3 overflow-x-auto px-5 pb-4 -mx-5 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[110px] h-[110px] flex-shrink-0 rounded-[20px] bg-tg-secondary border border-tg-border/40 animate-pulse shadow-sm flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-tg-hint/20" />
              </div>
            ))}
          </div>
        ) : recentFavs.length > 0 ? (
          /* Lista Real */
          <div className="flex gap-3 overflow-x-auto px-5 pb-4 -mx-5 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.data.photo) ? fileUrl(fav.data.photo[0].file_id) : null;
              return (
                <button
                  key={fav._id}
                  onClick={() => go('/favorites')}
                  className="flex-shrink-0 relative group active:scale-[0.96] transition-transform duration-200 overflow-hidden rounded-[20px] shadow-sm border border-tg-border/40 bg-tg-secondary w-[110px] h-[110px]"
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
                </button>
              );
            })}
          </div>
        ) : (
          /* Empty State Elegante */
          <div className="mx-5 p-6 rounded-[24px] bg-tg-secondary border border-tg-border/40 text-center shadow-sm flex flex-col items-center justify-center">
            <Star size={28} className="text-tg-hint/40 mb-3" />
            <h3 className="text-[15px] font-semibold text-tg-text mb-1">No favorites yet</h3>
            <p className="text-[13px] text-tg-hint mb-4">Start saving your favorite commands.</p>
            <button
              onClick={() => go('/favorites')}
              className="px-5 py-2 rounded-xl bg-tg-accent/10 text-tg-accent font-medium text-[14px] active:scale-95 transition-all"
            >
              Explore Commands
            </button>
          </div>
        )}
      </section>

      {/* ── Tarjeta de Inspiración (Glassmorphism Premium) ── */}
      <section className="mt-6 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-3">{t('inspiration_day')}</h2>
        <button
          onClick={() => go('/favorites/inspiration')}
          className="w-full relative overflow-hidden rounded-[24px] active:scale-[0.98] transition-transform duration-200 shadow-md group text-left block"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />

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

            <div className="mt-6 flex items-center gap-1.5 text-white font-bold text-[13px] bg-white/10 border border-white/20 w-max px-4 py-2 rounded-xl backdrop-blur-lg group-active:bg-white/20 transition-colors">
              <span>{t('explore_gallery')}</span>
              <ChevronRight size={16} strokeWidth={2.5} />
            </div>
          </div>
        </button>
      </section>

    </div>
  );
}