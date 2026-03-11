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
  Star,
  FlaskConical
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
    loadFavs();
    if (!loaded) loadGamification();
    const timer = setTimeout(() => setShowGreeting(true), 100);
    return () => clearTimeout(timer);
  }, [loadFavs, loaded, loadGamification]);

  const recentFavs = items.slice(0, 6);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  return (
    <div className="pb-24 animate-fade-in relative overflow-x-hidden">
      
      {/* ── Saludo Hero ── */}
      <div className={`px-4 pt-8 pb-3 transition-all duration-700 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-3.5 mb-2">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-[52px] h-[52px] rounded-full ring-[3px] ring-tg-accent/20 object-cover shadow-sm" />
          ) : (
            <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-[22px] font-black ring-[3px] ring-tg-accent/20 shadow-sm">
              {firstName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-[26px] font-extrabold text-tg-text  leading-none mb-1">
              {t('greeting', { name: firstName })}
            </h1>
            <p className="text-[14px] font-medium text-tg-hint/80 tracking-wide">{t('welcome_back')}</p>
          </div>
        </div>
      </div>

      {/* ── Global Usage Counter ── */}
      <div className="px-4 mt-3">
        <CommandUsageCounter />
      </div>

      {/* ── Mini Tarjeta XP + Racha ── */}
      <div className="px-5 mt-6 mb-2">
        <XPProgress compact />
      </div>
      {/* ── Grid de Accesos Directos (Bento Grid) ── */}
      <section className="mt-4 px-4">
        <h2 className="text-[14px] font-bold text-tg-hint uppercase  px-1 mb-2.5">{t('control_panel')}</h2>
        <div className="grid grid-cols-2 gap-3">
          
          <button onClick={() => go('/favorites')} className="flex items-center gap-3.5 p-3 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all shadow-sm hover:bg-white/[0.02] group">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Heart size={20} className="text-white fill-white/20" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text  truncate">{t('favorites')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('your_gallery')}</div>
            </div>
          </button>
          
          <button onClick={() => go('/premium')} className="flex items-center gap-3.5 p-3 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all shadow-sm hover:bg-white/[0.02] group">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-blue-500 to-tg-accent flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Terminal size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text  truncate">{t('commands')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('custom')}</div>
            </div>
          </button>
          
          <button onClick={() => go('/subscription')} className="flex items-center gap-3.5 p-3 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all shadow-sm hover:bg-white/[0.02] group">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Crown size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text  truncate">{t('subscription')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('manage_plan')}</div>
            </div>
          </button>
          
          <button onClick={() => go('/payments')} className="flex items-center gap-3.5 p-3  rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all shadow-sm hover:bg-white/[0.02] group">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Receipt size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text  truncate">{t('payments')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('view_history')}</div>
            </div>
          </button>
          
        </div>
      </section>


      {/* ── Acciones Rápidas (Shortcuts) ── */}
      <section className="mt-5">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[14px] font-bold text-tg-hint uppercase ">{t('quick_actions')}</h2>
          <button onClick={() => go('/bot-commands')} className="text-[12px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            {t('view_catalog')}
          </button>
        </div>
        {/* Este componente ya lo estilizamos antes con scroll nativo oculto */}
        <CommandShortcuts onRun={(cmd) => go(`/bot-commands/${cmdSlug(cmd)}`)} />
      </section>

      {/* ── Franja de Gamificación (Logros y Descubrir) ── */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          
          <button 
            onClick={() => go('/achievements')} 
            className="relative flex items-center gap-3.5 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left transition-all active:scale-[0.96] hover:bg-white/[0.02] shadow-sm group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(245,158,11,0.25)] border border-white/10 group-hover:scale-105 transition-transform">
              <Trophy size={18} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-extrabold text-tg-text  truncate">{t('achievements_count', { count: unlockedCount })}</div>
              <div className="text-[12px] font-medium text-tg-hint/80 truncate mt-0.5">{t('remaining_count', { count: achievements.length - unlockedCount })}</div>
            </div>
          </button>

          <button 
            onClick={() => go('/discover')} 
            className="relative flex items-center gap-3.5 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left transition-all active:scale-[0.96] hover:bg-white/[0.02] shadow-sm group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(139,92,246,0.25)] border border-white/10 group-hover:scale-105 transition-transform">
              <Compass size={18} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="text-[15px] font-extrabold text-tg-text  truncate">{t('discover')}</div>
              <div className="text-[12px] font-medium text-tg-hint/80 truncate mt-0.5">{t('explore_more')}</div>
            </div>
          </button>
          
        </div>
      </div>

      {/* ── Comandos Usados Recientemente ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[14px] font-bold text-tg-hint uppercase  flex items-center gap-1.5">
            <Clock size={14} className="text-tg-hint" /> {t('recent')}
          </h2>
          <button onClick={() => go('/activity')} className="text-[12px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            {t('view_history')}
          </button>
        </div>
        <div className="px-4">
          <RecentCommands onTap={(cmd) => {
            const slug = cmd.replace('/', '');
            go(`/bot-commands/${slug}`);
          }} />
        </div>
      </section>

      {/* ── Favoritos Recientes (Carrusel) ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[14px] font-bold text-tg-hint uppercase  flex items-center gap-1.5">
            <Heart size={14} className="text-tg-hint" /> {t('your_favorites')}
          </h2>
          <button onClick={() => go('/favorites')} className="text-[12px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            {t('common:view_gallery')}
          </button>
        </div>
        
        {favsLoading && recentFavs.length === 0 ? (
          /* Esqueleto de Carga */
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 -mx-5 pl-10 pr-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-28 h-28 flex-shrink-0 rounded-[20px] bg-tg-secondary border border-tg-border/50 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : recentFavs.length > 0 ? (
          /* Lista Real */
          <div className="flex gap-3 overflow-x-auto px-4 pb-3 -mx-5 pl-10 pr-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.data.photo) ? fileUrl(fav.data.photo[0].file_id) : null;
              
              return (
                <button
                  key={fav._id}
                  onClick={() => go('/favorites')}
                  className="flex-shrink-0 relative group active:scale-[0.94] transition-transform duration-200 overflow-hidden rounded-[20px] shadow-sm border border-tg-border/50 bg-tg-secondary w-28 h-28"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    /* Tarjeta de Fallback si no hay imagen */
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-black/10">
                      <ImageIcon size={22} className="text-tg-hint/30 mb-2" />
                      <span className="text-[10px] font-medium text-tg-hint leading-snug line-clamp-2 w-full break-words">
                        {fav.data?.caption || fav.context || t('no_title')}
                      </span>
                    </div>
                  )}
                  {/* Gradiente oscuro inferior para legibilidad si agregaras texto encima */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                </button>
              );
            })}
          </div>
        ) : (
          /* Estado Vacío */
          <div className="mx-5 p-6 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto bg-black/20 border border-white/5 rounded-full flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-tg-hint/40" />
            </div>
            <div className="text-[14px] font-medium text-tg-hint leading-relaxed">
              {t('no_favorites_yet')}<br />
              <button onClick={() => go('/favorites')} className="text-tg-accent font-bold mt-1.5 active:scale-95 transition-transform hover:brightness-110">
                {t('start_exploring')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Tarjeta de Inspiración (Glassmorphism Prominente) ── */}
      <section className="mt-8 px-4 pb-4">
        <h2 className="text-[14px] font-bold text-tg-hint uppercase  mb-3">{t('inspiration_day')}</h2>
        
        <button
          onClick={() => go('/favorites/inspiration')}
          className="w-full relative overflow-hidden rounded-[24px] active:scale-[0.98] transition-transform duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)] group text-left block"
        >
          {/* Fondo colorido base */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Efecto Cristal (Blur Oscuro) */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
          
          {/* Contenido (Sobre el cristal) */}
          <div className="relative p-6 border border-white/15 rounded-[24px] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-300 fill-amber-300/30" />
                <span className="text-[11px] font-extrabold uppercase  text-amber-300">
                  {t('featured_prompt')}
                </span>
              </div>
              <p className="text-[16px] text-white leading-snug font-semibold drop-shadow-sm">
                "A dreamy landscape with floating islands at sunset, digital art masterpiece"
              </p>
            </div>
            
            <div className="mt-6 flex items-center gap-1.5 text-white font-extrabold text-[12px] uppercase tracking-wider bg-white/10 border border-white/10 w-max px-4 py-2.5 rounded-full backdrop-blur-md group-hover:bg-white/20 transition-colors">
              <span>{t('explore_gallery')}</span>
              <ChevronRight size={14} strokeWidth={3} />
            </div>
          </div>
        </button>
      </section>

    </div>
  );
}