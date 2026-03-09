import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useConfigStore } from '../stores/config';
import {
  Sparkles,
  Maximize2,
  Palette,
  Terminal,
  ChevronRight,
  Plus,
  Compass,
  Star,
  FlaskConical
} from 'lucide-react';
import { TOTAL_BOT_COMMANDS } from '@/data/botCommands';


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

  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  const userCommands = config?.commands ? Object.entries(config.commands) : [];

  return (
    <div className="pb-24 animate-fade-in relative">

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[26px] font-extrabold text-tg-text tracking-tight leading-none">Comandos</h1>
        <p className="text-[14px] font-medium text-tg-hint/80 mt-1.5 tracking-wide">Herramientas y favoritos</p>
      </div>

      {/* ── Explorar Bot Commands (NEW) ── */}
      <section className="mt-2 px-5">
        <button
          onClick={() => go('/bot-commands')}
          className="w-full bg-gradient-to-br from-tg-accent/10 to-violet-500/10 border border-tg-accent/20 rounded-[22px] p-5 text-left active:scale-[0.98] transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center shadow-lg shadow-tg-accent/20 flex-shrink-0">
              <Compass size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-extrabold text-tg-text tracking-tight">Explorar Comandos</h3>
              <p className="text-[13px] text-tg-hint mt-0.5">Descubre los {TOTAL_BOT_COMMANDS} comandos del bot con búsqueda, categorías y más</p>
            </div>
            <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>

      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">

          {/* ── Botón Favoritos ── */}
          <button
            onClick={() => go('/command-favorites')}
            className="flex items-center gap-3.5 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all hover:bg-tg-text/[0.02] shadow-sm group"
          >
            {/* gradient bg */}
            <div className="w-11 h-11 rounded-[14px] bg-amber-500 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner bg-gradient-to-br from-amber-400 to-yellow-500">
              <Star size={20} className="fill-amber-500/20 text-white" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[15px] font-extrabold text-tg-text tracking-tight truncate">Favoritos</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">Mis comandos</div>
            </div>
          </button>

          {/* ── Botón Labs ── */}
          <button
            onClick={() => go('/labs')}
            className="flex items-center gap-3.5 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/50 text-left active:scale-[0.96] transition-all hover:bg-tg-text/[0.02] shadow-sm group"
          >
            <div className="w-11 h-11 rounded-[14px] bg-purple-500 border border-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner bg-gradient-to-br from-purple-400 to-pink-500">
              <FlaskConical size={20} className="fill-purple-500/20 text-white" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[15px] font-extrabold text-tg-text tracking-tight truncate">Labs</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">Experimental</div>
            </div>
          </button>

        </div>
      </section>

      {/* ── Premium Commands (Carrusel Horizontal) ── */}
      <section className="mt-5">
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
            <div className="divide-y divide-tg-border/20">
              {userCommands.slice(0, 5).map(([key, cmd]) => (
                <button
                  key={key}
                  onClick={() => go(`/commands/${key}`)}
                  className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors"
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


    </div>
  );
}