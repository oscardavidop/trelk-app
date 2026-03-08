import { useMemo } from 'react';
import { useGamificationStore } from '../stores/gamification';
import { useHideIsland } from '../hooks/useHideIsland';
import ActivityItem from '../components/activity/ActivityItem';
import XPProgress from '../components/XPProgress';
import { Activity, Clock } from 'lucide-react';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function ActivityPage() {
  useHideIsland();
  const { history } = useGamificationStore();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof history>();
    for (const e of history) {
      const key = dayLabel(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [history]);

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-5 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
          <Activity className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight leading-none">Actividad</h1>
          <p className="text-[13px] font-medium text-tg-hint/80 mt-1">Tu historial de uso reciente</p>
        </div>
      </div>

      {/* ── XP Card ── */}
      <div className="px-5 mb-5 animate-slide-up">
        <XPProgress compact />
      </div>

      {/* ── Stats Strip (Bento Grid) ── */}
      <div className="px-5 mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-tg-text leading-none">
              {history.filter((h) => h.type === 'command').length}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Comandos</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-tg-text leading-none">
              {history.filter((h) => h.type === 'favorite_added').length}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Favoritos</div>
          </div>
          <div className="bg-tg-secondary rounded-[18px] border border-tg-border/50 p-3.5 flex flex-col items-center justify-center shadow-sm">
            <div className="text-[22px] font-black text-tg-text leading-none">
              {grouped.length}
            </div>
            <div className="text-[10px] font-bold text-tg-hint uppercase tracking-widest mt-1.5">Días</div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        {grouped.length > 0 ? (
          grouped.map(([label, entries]) => (
            <section key={label} className="mb-6">
              {/* Etiqueta del Día */}
              <div className="px-6 mb-2">
                <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest">{label}</h2>
              </div>
              
              {/* Contenedor de la Lista del Día */}
              <div className="mx-5 bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
                <div className="divide-y divide-white/5">
                  {entries.map((e) => (
                    <ActivityItem key={e.id} entry={e} />
                  ))}
                </div>
              </div>
            </section>
          ))
        ) : (
          /* ── Estado Vacío ── */
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4 shadow-sm">
              <Clock size={32} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-bold text-tg-text tracking-tight">Sin actividad aún</p>
            <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Usa comandos en el bot para ver tu historial aparecer aquí.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}