import { useState } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { BOT_COMMANDS, cmdSlug } from '../../data/botCommands';

interface Props {
  onSelect: (slug: string) => void;
}

export default function CommandSuggestions({ onSelect }: Props) {
  const [visible, setVisible] = useState(true);
  
  // Mantenemos el estado inicial aleatorio para que no cambie en cada re-render
  const [suggestions] = useState(() => {
    const shuffled = [...BOT_COMMANDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

  if (!visible) return null;

  return (
    <div className="mx-5 mt-6 bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
      
      {/* ── Encabezado ── */}
      {/* bg-tg-text/[0.02] da un sombreado del 2% del color del texto, ideal para ambos temas */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tg-border/50 bg-tg-text/[0.02]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500 fill-amber-500/20" />
          <span className="text-[12px] font-extrabold text-tg-text uppercase tracking-widest">
            Sugerencias para ti
          </span>
        </div>
        
        {/* Botón de cerrar adaptativo */}
        <button 
          onClick={() => setVisible(false)} 
          className="w-7 h-7 rounded-full bg-tg-text/[0.05] border border-tg-border/30 flex items-center justify-center hover:bg-tg-text/[0.1] active:scale-90 transition-all text-tg-hint hover:text-tg-text"
          title="Ocultar sugerencias"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Lista de Sugerencias ── */}
      <div className="divide-y divide-tg-border/50">
        {suggestions.map((cmd) => {
          const slug = cmdSlug(cmd);
          return (
            <button
              key={slug}
              onClick={() => onSelect(slug)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-tg-text/[0.02] active:bg-tg-text/[0.04] group"
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                
                {/* Etiqueta del Comando adaptativa */}
                <span className="text-[13px] font-bold font-mono text-tg-text bg-tg-text/[0.05] border border-tg-border/30 px-2.5 py-1 rounded-[8px] shadow-inner flex-shrink-0 tracking-tight">
                  /{slug}
                </span>
                
                {/* Descripción Truncada */}
                <span className="text-[12px] font-medium text-tg-hint truncate">
                  {cmd.description}
                </span>
                
              </div>
              
              {/* Flecha Animada */}
              <ChevronRight 
                size={16} 
                className="text-tg-hint/40 flex-shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" 
              />
            </button>
          );
        })}
      </div>
      
    </div>
  );
}