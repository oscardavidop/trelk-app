import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores';
import { useThemeStore, type ThemeMode } from '../stores/theme';
import { 
  ChevronRight, 
  Moon, 
  Sun, 
  Monitor, 
  Globe, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Palette, 
  Crown, 
  CreditCard 
} from 'lucide-react';

export default function SettingsHub() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: tgUser, haptic } = useTelegram();
  const appUser = useUserStore((s) => s.user);
  const { mode: themeMode, setMode } = useThemeStore();

  const displayName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || 'User';
  const photoUrl = tgUser?.photo_url;
  const tgId = appUser?.authTelegram?.id || appUser?.id;

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`);
  };

  const themeLabel = themeMode === 'dark' ? 'Oscuro' : themeMode === 'light' ? 'Claro' : 'Sistema';
  
  // Icono dinámico según el tema
  const ThemeIcon = themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Monitor;

  const cycleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' };
    haptic?.impactOccurred('light');
    setMode(next[themeMode]);
  };

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[26px] font-extrabold text-tg-text tracking-tight leading-none">Ajustes</h1>
        <p className="text-[14px] font-medium text-tg-hint/80 mt-1.5 tracking-wide">Personaliza tu experiencia</p>
      </div>

      {/* ── Account Card ── */}
      <section className="px-5 mt-2">
        <button
          onClick={() => go('/profile')}
          className="w-full flex items-center gap-4 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-14 h-14 rounded-[16px] object-cover ring-2 ring-white/10 shadow-inner" />
          ) : (
            <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/10 shadow-inner">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-tg-text tracking-tight truncate">{displayName}</div>
            <div className="text-[13px] font-mono text-tg-hint/80 truncate mt-0.5">ID: {tgId}</div>
          </div>
          <ChevronRight size={20} className="text-tg-hint/50 flex-shrink-0" />
        </button>
      </section>

      {/* ── Preferences ── */}
      <section className="mt-8 px-5">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-3 pl-2">Preferencias</h2>
        
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-white/5">
            
            {/* Language */}
            <button onClick={() => go('/set/lang')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Globe size={18} className="text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Idioma</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Cambiar idioma del bot</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            {/* Timezone */}
            <button onClick={() => go('/set/timezone')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Zona horaria</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Ajustar hora local</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            {/* Country */}
            <button onClick={() => go('/set/country')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">País</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Seleccionar tu país</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>
            
          </div>
        </div>
      </section>

      {/* ── Bot Settings ── */}
      <section className="mt-8 px-5">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-3 pl-2">Ajustes del Bot</h2>
        
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-white/5">
            
            <button onClick={() => go('/settings')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={18} className="text-tg-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Preferencias del chat</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Formato, historial, respuestas...</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            <button onClick={() => go('/set/theme')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                <Palette size={18} className="text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Apariencia</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Temas y personalización visual</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

          </div>
        </div>
      </section>

      {/* ── Plan & Payments ── */}
      <section className="mt-8 px-5 pb-4">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-3 pl-2">Plan y Pagos</h2>
        
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-white/5">
            
            <button onClick={() => go('/subscription')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Tu plan</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Gestionar suscripción y límites</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            <button onClick={() => go('/payments')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">Pagos</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">Historial y transacciones</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

          </div>
        </div>
      </section>

    </div>
  );
}