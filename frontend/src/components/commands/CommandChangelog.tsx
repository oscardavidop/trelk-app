import { GitBranch, Tag, Clock } from 'lucide-react';
import type { ChangelogEntry } from '../../data/commandMocks';

interface Props {
  entries: ChangelogEntry[];
}

export default function CommandChangelog({ entries }: Props) {
  if (!entries.length) return null;

  return (
    <section className="px-5 mt-8 pb-4">
      <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1">
        <GitBranch size={14} className="text-tg-accent" /> Historial de cambios
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
        {/* Usamos tg-border para la división adaptativa en lugar de white/5 */}
        <div className="divide-y divide-tg-border/50">
          {entries.map((entry, i) => (
            // hover dinámico: usa el color del texto con 2% de opacidad (funciona en Light y Dark)
            <div key={i} className="p-4 transition-colors hover:bg-tg-text/[0.02] group">
              
              {/* ── Cabecera de la Versión ── */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 bg-tg-accent/10 border border-tg-accent/20 px-2 py-0.5 rounded-[8px]">
                  <Tag size={12} className="text-tg-accent" />
                  <span className="text-[12px] font-bold text-tg-accent font-mono tracking-tight">
                    v{entry.version}
                  </span>
                </div>
                
                {/* Etiqueta de fecha adaptativa */}
                <div className="flex items-center gap-1.5 text-tg-hint/80 bg-tg-surface/50 px-2 py-0.5 rounded-[6px] border border-tg-border/30">
                  <Clock size={10} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{entry.date}</span>
                </div>
              </div>
              
              {/* ── Lista de Cambios ── */}
              <ul className="space-y-2">
                {entry.changes.map((change, j) => (
                  <li key={j} className="text-[13px] text-tg-text/90 flex items-start gap-2.5 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-tg-accent mt-2 flex-shrink-0 opacity-80" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
              
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}