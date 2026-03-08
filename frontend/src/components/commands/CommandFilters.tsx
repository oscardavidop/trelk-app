import { CATEGORY_META, getCategories } from '../../data/botCommands';
import { Search, X } from 'lucide-react';

type SortKey = 'alpha' | 'category';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  total: number;
}

export default function CommandFilters({
  search, onSearchChange,
  category, onCategoryChange,
  sort, onSortChange,
  total,
}: Props) {
  const cats = getCategories();

  return (
    <div className="space-y-4">
      
      {/* ── Buscador ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/20 border border-white/5 rounded-[14px] shadow-inner focus-within:border-tg-accent/40 transition-colors">
        <Search className="w-5 h-5 text-tg-hint shrink-0" />
        <input
          type="search"
          className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/60 outline-none"
          placeholder="Buscar comando, alias o descripción..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {search && (
          <button 
            onClick={() => onSearchChange('')} 
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-tg-text/80 hover:bg-white/20 hover:text-white active:scale-90 transition-all shrink-0"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Píldoras de Categoría (Pills) ── */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        <button
          onClick={() => onCategoryChange('all')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95 border ${
            category === 'all'
              ? 'bg-tg-accent border-tg-accent text-white shadow-[0_2px_10px_rgba(var(--tg-accent-rgb),0.3)]'
              : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-white/[0.02]'
          }`}
        >
          Todos ({total})
        </button>
        
        {cats.map((c) => {
          const meta = CATEGORY_META[c] ?? { label: c, color: '#6b7280', icon: '📦' };
          const isActive = category === c;
          
          return (
            <button
              key={c}
              onClick={() => onCategoryChange(isActive ? 'all' : c)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95 flex items-center gap-1.5 border ${
                isActive
                  ? 'shadow-sm'
                  : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-white/[0.02]'
              }`}
              style={
                isActive 
                  ? { 
                      backgroundColor: `${meta.color}15`, 
                      borderColor: `${meta.color}40`, 
                      color: meta.color 
                    } 
                  : undefined
              }
            >
              {/* Contenedor del ícono para respetar el tipo (componente o string) */}
              <span className={`flex items-center justify-center ${isActive ? '' : 'opacity-60'}`}>
                {/* Nota: Mantenemos la estructura original de tu meta.icon por si es 
                  un componente React. Si en algún momento cambias a usar solo strings/emojis, 
                  puedes poner simplemente {meta.icon} aquí.
                */}
                {typeof meta.icon === 'string' ? (
                  meta.icon
                ) : (
                  <meta.icon className="w-4 h-4" style={{ color: isActive ? meta.color : undefined }} />
                )}
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ── Segmented Control de Ordenamiento ── */}
      <div className="flex items-center justify-between px-1 mt-1">
        <span className="text-[11px] font-bold text-tg-hint uppercase tracking-widest">
          Ordenar por:
        </span>
        <div className="flex bg-black/20 p-1 rounded-[10px] border border-white/5">
          {([['alpha', 'A-Z'], ['category', 'Categoría']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              className={`text-[11px] font-extrabold px-3 py-1 rounded-[6px] transition-all active:scale-95 ${
                sort === key
                  ? 'bg-tg-secondary text-tg-accent shadow-sm border border-white/5'
                  : 'text-tg-hint hover:text-tg-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
}

export type { SortKey };