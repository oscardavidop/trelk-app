import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useFavoritesStore } from '../stores/favorites';
import { useConfigStore } from '../stores/config';
import { fileUrl } from '../services/favoritesApi';
import { 
  Sparkles, 
  Maximize2, 
  Palette, 
  Terminal, 
  ChevronRight, 
  Plus, 
  Heart,
  ImageIcon
} from 'lucide-react';

// ── Datos mejorados con Iconos y Gradientes Únicos ──
const PREMIUM_COMMANDS = [
  { name: '/imagine-pro', desc: 'Generación HD con DALL·E 3', badge: 'PRO', icon: Sparkles, gradient: 'from-purple-500 to-indigo-600' },
  { name: '/upscale-hd', desc: 'Upscale 4x con Real-ESRGAN', badge: 'PRO', icon: Maximize2, gradient: 'from-blue-400 to-tg-accent' },
  { name: '/style-transfer', desc: 'Transfiere estilo artístico', badge: 'PRO', icon: Palette, gradient: 'from-amber-400 to-orange-500' },
];

export default function CommandsHub() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { config, load: loadConfig } = useConfigStore();
  const { items, load: loadFavs, loading: favsLoading } = useFavoritesStore();

  useEffect(() => {
    if (!config) loadConfig();
    loadFavs();
  }, [config, loadConfig, loadFavs]);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  const userCommands = config?.commands ? Object.entries(config.commands) : [];
  const recentFavs = items.slice(0, 9);

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[26px] font-extrabold text-tg-text tracking-tight leading-none">Comandos</h1>
        <p className="text-[14px] font-medium text-tg-hint/80 mt-1.5 tracking-wide">Herramientas y favoritos</p>
      </div>

      {/* ── Premium Commands (Carrusel Horizontal) ── */}
      <section className="mt-2">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-[16px] font-bold text-tg-text tracking-tight">Premium</h2>
          <button onClick={() => go('/premium')} className="text-[13px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            Ver todos
          </button>
        </div>
        
        {/* Scroll oculto nativamente */}
        <div className="flex gap-3 overflow-x-auto w-full px-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {PREMIUM_COMMANDS.map((cmd) => (
            <button
              key={cmd.name}
              onClick={() => go('/premium')}
              className="flex-shrink-0 w-[180px] bg-tg-secondary border border-tg-border/30 p-4 rounded-[24px] text-left active:scale-[0.96] transition-all duration-200 shadow-md hover:brightness-110"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${cmd.gradient} flex items-center justify-center shadow-inner`}>
                  <cmd.icon size={20} className="text-white" />
                </div>
                <span className="text-[9px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {cmd.badge}
                </span>
              </div>
              <div className="text-[15px] font-extrabold text-tg-text tracking-tight">{cmd.name}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-1 leading-snug line-clamp-2">{cmd.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Custom Commands (Lista Estilo iOS) ── */}
      <section className="mt-4 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-tg-text tracking-tight">Mis comandos</h2>
          <button onClick={() => go('/commands')} className="text-[13px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            Gestionar
          </button>
        </div>
        
        {userCommands.length > 0 ? (
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
            <div className="divide-y divide-white/5">
              {userCommands.slice(0, 5).map(([key, cmd]) => (
                <button
                  key={key}
                  onClick={() => go(`/commands/${key}`)}
                  className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-[12px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Terminal size={18} className="text-tg-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-tg-text tracking-tight truncate">/{key}</div>
                    <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5 uppercase tracking-wide">
                      {(cmd as any)?.engine || 'google'} · {(cmd as any)?.inline?.results_per_page || 5} res
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => go('/commands')}
            className="w-full bg-tg-secondary/50 border border-dashed border-tg-border rounded-[20px] p-6 text-center active:scale-[0.98] transition-transform hover:bg-tg-secondary"
          >
            <div className="w-12 h-12 rounded-[14px] bg-tg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Plus size={24} className="text-tg-accent" />
            </div>
            <div className="text-[15px] text-tg-text font-bold tracking-tight">Crear primer comando</div>
            <div className="text-[13px] font-medium text-tg-hint mt-1">Automatiza tus búsquedas frecuentes</div>
          </button>
        )}
      </section>

      {/* ── Favorites Grid ── */}
      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-tg-text tracking-tight">Favoritos</h2>
          <button onClick={() => go('/favorites')} className="text-[13px] font-bold text-tg-accent hover:brightness-125 transition-colors">
            Ver galería
          </button>
        </div>
        
        {favsLoading && recentFavs.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-[16px] bg-tg-secondary border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : recentFavs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {recentFavs.map((fav) => {
              const thumb = (fav.data?.media_type === 'photo' && fav.engine_id) ? fileUrl(fav.engine_id) : null;
              return (
                <button
                  key={fav._id}
                  onClick={() => go('/favorites')}
                  className="aspect-square relative rounded-[16px] overflow-hidden active:scale-[0.94] transition-all duration-200 group bg-tg-secondary border border-white/5 shadow-sm"
                >
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <ImageIcon size={20} className="text-tg-hint/30 mb-1" />
                      <span className="text-tg-hint text-[10px] font-medium leading-tight line-clamp-2 px-1">
                        {fav.data?.caption || fav.context}
                      </span>
                    </div>
                  )}
                  {/* Gradiente sutil y overlay al presionar */}
                  {thumb && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-active:opacity-100 transition-opacity pointer-events-none" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-center">
            <div className="w-12 h-12 mx-auto bg-white/[0.04] rounded-full flex items-center justify-center mb-3">
              <Heart size={24} className="text-tg-hint/40" />
            </div>
            <div className="text-[14px] font-medium text-tg-hint">Tu galería de favoritos aparecerá aquí</div>
          </div>
        )}
      </section>
    </div>
  );
}