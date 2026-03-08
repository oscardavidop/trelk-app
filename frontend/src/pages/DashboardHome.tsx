import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useFavoritesStore } from '../stores/favorites';
import { useEffect, useState } from 'react';
import { fileUrl } from '../services/favoritesApi';
import { 
  Heart, 
  Terminal, 
  Crown, 
  Receipt, 
  Palette, 
  Layers, 
  Maximize2, 
  Search, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

/* ── Mock data ── */
const POPULAR_COMMANDS = [
  { name: '/imagine', desc: 'Genera una imagen desde texto', icon: Palette },
  { name: '/variations', desc: 'Crea variaciones de una imagen', icon: Layers },
  { name: '/upscale', desc: 'Aumenta la resolución', icon: Maximize2 },
  { name: '/describe', desc: 'Describe una imagen con IA', icon: Search },
];

const INSPIRATION = {
  caption: 'A dreamy landscape with floating islands at sunset, digital art masterpiece',
  gradient: 'from-purple-500/40 via-pink-500/30 to-orange-500/40',
};

export default function DashboardHome() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, haptic } = useTelegram();
  const { items, load: loadFavs, loading: favsLoading } = useFavoritesStore();
  const [showGreeting, setShowGreeting] = useState(false);

  const firstName = user?.first_name || 'User';
  const photoUrl = user?.photo_url;

  useEffect(() => {
    loadFavs();
    requestAnimationFrame(() => setShowGreeting(true));
  }, [loadFavs]);

  const recentFavs = items.slice(0, 6);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Hero greeting ── */}
      <div className={`px-5 pt-8 pb-3 transition-all duration-500 ease-out ${showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-3.5 mb-1">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-12 h-12 rounded-full ring-2 ring-tg-accent/40 object-cover shadow-lg" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-xl font-bold ring-2 ring-tg-accent/30 shadow-lg">
              {firstName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight leading-none mb-1">
              Hola, {firstName}
            </h1>
            <p className="text-[14px] font-medium text-tg-hint/80 tracking-wide">Bienvenido de vuelta</p>
          </div>
        </div>
      </div>

      {/* ── Quick actions (Bento Grid) ── */}
      <div className="px-5 py-3">
        <div className="grid grid-cols-2 gap-3">
          
          <button onClick={() => go('/favorites')} className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Heart size={20} className="text-white fill-white/20" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text tracking-tight truncate">Favoritos</div>
              <div className="text-[12px] font-medium text-tg-hint truncate">Tu galería</div>
            </div>
          </button>
          
          <button onClick={() => go('/commands')} className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-blue-500 to-tg-accent flex items-center justify-center flex-shrink-0 shadow-inner">
              <Terminal size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text tracking-tight truncate">Comandos</div>
              <div className="text-[12px] font-medium text-tg-hint truncate">Personalizados</div>
            </div>
          </button>
          
          <button onClick={() => go('/subscription')} className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Crown size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text tracking-tight truncate">Plan</div>
              <div className="text-[12px] font-medium text-tg-hint truncate">Suscripción</div>
            </div>
          </button>
          
          <button onClick={() => go('/payments')} className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Receipt size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-tg-text tracking-tight truncate">Pagos</div>
              <div className="text-[12px] font-medium text-tg-hint truncate">Historial</div>
            </div>
          </button>
          
        </div>
      </div>

      {/* ── Recent Favorites ── */}
      <section className="mt-4">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-[16px] font-bold text-tg-text tracking-tight">Favoritos recientes</h2>
          <button onClick={() => go('/favorites')} className="text-[13px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            Ver todos
          </button>
        </div>
        
        {favsLoading && recentFavs.length === 0 ? (
          <div className="flex gap-3 px-5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-28 h-28 flex-shrink-0 rounded-[18px] bg-tg-secondary border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : recentFavs.length > 0 ? (
          <div className="flex gap-3 px-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.engine_id) ? fileUrl(fav.engine_id) : null;
              return (
                <button
                  key={fav._id}
                  onClick={() => go('/favorites')}
                  className="flex-shrink-0 relative group active:scale-[0.94] transition-transform duration-200"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="w-28 h-28 rounded-[18px] object-cover bg-tg-secondary border border-white/5 shadow-sm"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-[18px] bg-tg-secondary border border-white/5 flex flex-col items-center justify-center p-2 text-center">
                      <Heart size={20} className="text-tg-hint/40 mb-2" />
                      <span className="text-tg-hint text-[10px] font-medium leading-tight line-clamp-2">
                        {fav.data?.caption || fav.context}
                      </span>
                    </div>
                  )}
                  {/* Sutil gradiente oscuro inferior */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent rounded-b-[18px] pointer-events-none" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-5 p-6 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-center">
            <div className="w-12 h-12 mx-auto bg-white/[0.04] rounded-full flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-tg-hint/40" />
            </div>
            <div className="text-[14px] font-medium text-tg-hint leading-relaxed">
              Aún no tienes favoritos.<br />
              <button onClick={() => go('/favorites')} className="text-tg-accent font-bold mt-1.5 active:scale-95 transition-transform">
                Comenzar a explorar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Popular Commands (Estilo iOS List) ── */}
      <section className="mt-6 px-5">
        <h2 className="text-[16px] font-bold text-tg-text tracking-tight mb-3">Comandos populares</h2>
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-white/5">
            {POPULAR_COMMANDS.map((cmd) => (
              <button
                key={cmd.name}
                onClick={() => go('/hub')}
                className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
              >
                <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <cmd.icon size={18} className="text-tg-text/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-tg-text tracking-tight">{cmd.name}</div>
                  <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5">{cmd.desc}</div>
                </div>
                <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inspiration Card ── */}
      <section className="mt-8 px-5 pb-4">
        <h2 className="text-[16px] font-bold text-tg-text tracking-tight mb-3">Inspiración del día</h2>
        <button
          onClick={() => go('/favorites/inspiration')}
          className="w-full relative overflow-hidden rounded-[24px] active:scale-[0.97] transition-all duration-300 shadow-lg group"
        >
          {/* Fondo animado */}
          <div className={`absolute inset-0 bg-gradient-to-br ${INSPIRATION.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
          
          <div className="relative p-6 border border-white/10 rounded-[24px]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-amber-400 fill-amber-400/20" />
              <span className="text-[13px] font-bold uppercase tracking-widest text-amber-400">
                Inspiration
              </span>
            </div>
            
            <p className="text-[15px] text-white/95 leading-snug font-medium text-left">
              "{INSPIRATION.caption}"
            </p>
            
            <div className="mt-5 flex items-center gap-1.5 text-white font-bold text-[13px] bg-white/10 w-max px-3.5 py-2 rounded-full">
              <span>Explorar más</span>
              <ChevronRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        </button>
      </section>

    </div>
  );
}