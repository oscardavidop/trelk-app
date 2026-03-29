import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  FlaskConical,
  Clock
} from 'lucide-react';
import { TOTAL_BOT_COMMANDS, cmdSlug } from '@/data/botCommands';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores';
import StickyHeader from '@/components/StickyHeader';
import { useRecentlyViewedCommands } from '@/hooks/useRecentlyViewedCommands';

// ── Datos mejorados con Iconos y Gradientes Únicos ──
const GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-violet-500 to-indigo-600',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-cyan-500',
];

export default function CommandsHub() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commands');
  const { config, load: loadConfig } = useConfigStore();
  const user = useUserStore((s) => s.user);

  const PREMIUM_COMMANDS = Object.entries(config?.premium_commands || {}).map(([key, cmd]) => ({
    name: `/${key}`,
    desc: (cmd as any).description || t('premium_command'),
    badge: (cmd as any).badge || 'PRO',
    icon: Sparkles, // Aquí podrías mapear a diferentes íconos según el comando
    gradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)], // Gradiente aleatorio
  }));

  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  const userCommands = config?.commands ? Object.entries(config.commands) : [];
  const { commands: recentlyViewed } = useRecentlyViewedCommands();

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title={t('title')} subtitle={t('hub_subtitle')} />



      {/* ── Explorar Bot Commands (Premium Banner) ── */}
      <section className={`${recentlyViewed.length > 0 ? 'mt-5' : 'mt-4'} px-5`}>
        <button
          onClick={() => go('/bot-commands')}
          className="w-full relative overflow-hidden bg-tg-secondary border border-tg-border/40 rounded-[24px] p-4 text-left active:scale-[0.98] transition-all duration-200 group shadow-sm"
        >
          {/* Fondo con gradiente sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-tg-accent/5 to-violet-500/5 pointer-events-none" />

          <div className="relative flex items-center gap-4">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)] flex-shrink-0 group-active:scale-95 transition-transform duration-200">
              <Compass size={24} className="text-white drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-tg-text leading-tight">{t('explore_commands')}</h3>
              <p className="text-[13px] font-medium text-tg-hint mt-0.5 leading-snug">{t('explore_desc', { count: TOTAL_BOT_COMMANDS })}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-tg-surface/50 flex items-center justify-center flex-shrink-0 group-hover:bg-tg-surface transition-colors">
              <ChevronRight size={18} className="text-tg-hint/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </section>

      {/* ── Utilidades (Bento Grid) ── */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">

          <button
            onClick={() => go('/command-favorites')}
            className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/40 text-left active:scale-[0.98] transition-all duration-200 shadow-sm group"
          >
            <div className="w-[42px] h-[42px] rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <Star size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-tg-text truncate leading-tight">{t('favorites:title')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('my_commands')}</div>
            </div>
          </button>

          <button
            onClick={() => go('/labs')}
            className="flex items-center gap-3 p-3.5 rounded-[20px] bg-tg-secondary border border-tg-border/40 text-left active:scale-[0.98] transition-all duration-200 shadow-sm group"
          >
            <div className="w-[42px] h-[42px] rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-active:scale-95 transition-transform duration-200">
              <FlaskConical size={20} className="text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-tg-text truncate leading-tight">{t('labs:title')}</div>
              <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">{t('labs:experimental')}</div>
            </div>
          </button>

        </div>
      </section>

      {/* ── Premium Commands (Carrusel Horizontal) ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-6 mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1">{t('subscription:premium')}</h2>
          {PREMIUM_COMMANDS.length > 0 && (
            <button onClick={() => go('/premium')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
              {t('common:view_all')}
            </button>
          )}
        </div>

        {PREMIUM_COMMANDS.length === 0 ? (
          /* Empty State Elegante */
          <div className="mx-5 p-6 rounded-[24px] bg-tg-secondary border border-tg-border/40 text-center shadow-sm flex flex-col items-center justify-center">
            <Sparkles size={28} className="text-tg-accent/60 mb-3" />
            <h3 className="text-[15px] font-semibold text-tg-text mb-1">{t('no_premium')}</h3>
            <p className="text-[13px] text-tg-hint mb-4">{t('explore_premium')}</p>
            <button
              onClick={() => go('/premium')}
              className="px-5 py-2 rounded-xl bg-tg-accent/10 text-tg-accent font-medium text-[14px] active:scale-95 transition-all"
            >
              Unlock Features
            </button>
          </div>
        ) : (
          /* Scroll oculto nativamente */
          <div className="flex gap-3 overflow-x-auto px-5 pb-4 pl-5 pr-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {PREMIUM_COMMANDS.map((cmd) => (
              <button
                key={cmd.name}
                onClick={() => go('/premium')}
                className="flex-shrink-0 w-[160px] bg-tg-secondary border border-tg-border/40 p-4 rounded-[20px] text-left active:scale-[0.96] transition-transform duration-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-[42px] h-[42px] rounded-[12px] bg-gradient-to-br ${cmd.gradient} flex items-center justify-center shadow-sm`}>
                    <cmd.icon size={20} className="text-white drop-shadow-sm" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {cmd.badge}
                  </span>
                </div>
                <div className="text-[15px] font-bold text-tg-text leading-tight mb-1">{cmd.name}</div>
                <div className="text-[12px] font-medium text-tg-hint leading-snug line-clamp-2">{cmd.desc}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Recently Viewed ── */}
      {recentlyViewed.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} /> {t('recently_viewed', 'Recently viewed')}
            </h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentlyViewed.slice(0, 8).map((cmd) => (
              <button
                key={cmdSlug(cmd)}
                onClick={() => go(`/bot-commands/${cmdSlug(cmd)}`)}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-[14px] bg-tg-secondary border border-tg-border/30 active:scale-95 transition-transform"
              >
                <Terminal size={14} className="text-tg-hint" />
                <span className="text-[13px] font-semibold text-tg-text whitespace-nowrap">/{cmd.name[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {/* ── Custom Commands (Lista Estilo iOS) ── */}
      <section className="mt-6 px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1">{t('my_commands')}</h2>
          <button onClick={() => go('/commands')} className="text-[13px] font-medium text-tg-accent active:opacity-70 transition-opacity">
            {t('manage')}
          </button>
        </div>

        {userCommands.length > 0 ? (
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
            <div className="flex flex-col">
              {userCommands.slice(0, 5).map(([key, cmd]) => (
                <button
                  key={key}
                  onClick={() => go(`/commands/${key}`)}
                  className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                >
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-tg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Terminal size={18} className="text-tg-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-tg-text leading-tight truncate">/{key}</div>
                    <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5 uppercase tracking-wide">
                      {(cmd as any)?.engine || 'google'} · {(cmd as any)?.inline?.results_per_page || 5} res
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-tg-hint/40 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => go('/commands')}
            className="w-full bg-tg-secondary/30 border border-dashed border-tg-border/50 rounded-[20px] p-6 text-center active:scale-[0.98] transition-transform duration-200 hover:bg-tg-secondary/60"
          >
            <div className="w-[46px] h-[46px] rounded-[14px] bg-tg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Plus size={24} className="text-tg-accent" />
            </div>
            <div className="text-[15px] text-tg-text font-semibold mb-0.5">{t('create_first')}</div>
            <div className="text-[13px] font-medium text-tg-hint">{t('automate_searches')}</div>
          </button>
        )}
      </section>

    </div>
  );
}