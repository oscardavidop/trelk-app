import { useThemeStore, type ThemeMode } from '../stores/theme';
import { useTelegram } from '../hooks/useTelegram';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

const THEME_OPTIONS: { mode: ThemeMode; label: string; description: string; icon: typeof Moon; bgClass: string }[] = [
  {
    mode: 'dark',
    label: 'Oscuro',
    description: 'Tema oscuro para reducir fatiga visual',
    icon: Moon,
    bgClass: 'bg-indigo-500',
  },
  {
    mode: 'light',
    label: 'Claro',
    description: 'Tema claro y brillante',
    icon: Sun,
    bgClass: 'bg-amber-500',
  },
  {
    mode: 'system',
    label: 'Sistema',
    description: 'Sigue el tema de tu dispositivo',
    icon: Monitor,
    bgClass: 'bg-slate-500',
  },
];

export default function ThemePage() {
  const { mode, setMode } = useThemeStore();
  const { haptic } = useTelegram();

  const handleSelect = (m: ThemeMode) => {
    haptic?.selectionChanged();
    setMode(m);
  };

  // Determinar qué icono mostrar en el cabezote dinámico
  const ActiveIcon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Vista Previa (Hero) ── */}
      <div className="flex flex-col items-center justify-center pt-10 pb-6 px-4 animate-scale-in">
        <div className="w-24 h-24 rounded-full bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center mb-5">
          <ActiveIcon className="w-12 h-12 text-tg-accent" strokeWidth={1.5} />
        </div>
        <h1 className="text-[22px] font-bold text-tg-text tracking-tight">Apariencia</h1>
        <p className="text-[14px] text-tg-hint text-center mt-1 max-w-[280px]">
          Elige cómo quieres que se vea la interfaz de la aplicación.
        </p>
      </div>

      {/* ── Lista de Opciones ── */}
      <div className="px-4 mt-2">
        <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2 px-1">
          Tema
        </h2>
        
        <div className="rounded-2xl bg-tg-secondary overflow-hidden divide-y divide-tg-border/20 animate-slide-up">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => handleSelect(opt.mode)}
              className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-tg-surface/40 active:bg-tg-surface/60"
            >
              <div className="flex items-center gap-3.5">
                {/* Contenedor del Icono Estilo iOS */}
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-sm ${opt.bgClass}`}>
                  <opt.icon size={18} className="text-white" strokeWidth={2} />
                </div>
                
                {/* Textos */}
                <div>
                  <div className="text-[15px] font-medium text-tg-text leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-[12px] text-tg-hint mt-0.5">
                    {opt.description}
                  </div>
                </div>
              </div>

              {/* Checkmark Nativo */}
              {mode === opt.mode && (
                <div className="ml-3">
                  <Check size={20} strokeWidth={2.5} className="text-tg-accent" />
                </div>
              )}
            </button>
          ))}
        </div>

        <p className="text-[12px] text-tg-hint/70 px-2 mt-3 leading-relaxed">
          El tema se guarda automáticamente y se aplica al instante en toda la app.
        </p>
      </div>

    </div>
  );
}