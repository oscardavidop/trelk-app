import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META, getCategories } from '../../data/botCommands';
import { Search, X, SlidersHorizontal } from 'lucide-react';

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
  const { t } = useTranslation('commandDetail');
  
  // Estado local para abrir/cerrar el panel de filtros
  const [showFilters, setShowFilters] = useState(false);
  
  // Saber si hay un filtro aplicado (para iluminar el botón)
  const hasActiveFilters = category !== 'all' || sort !== 'alpha';

  return (
    <div className="space-y-2">
      
      {/* ── Fila Principal: Buscador + Botón de Filtros ── */}
      <div className="flex gap-2.5">
        
        {/* Buscador */}
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-3 bg-tg-text/[0.03] border-2 border-tg-border/30 rounded-[16px] shadow-inner focus-within:border-tg-accent focus-within:border-2 transition-all">
          <Search className="w-[18px] h-[18px] text-tg-hint/70 shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/50 outline-none w-full"
            placeholder={t('search_commands')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button 
              onClick={() => onSearchChange('')} 
              className="w-6 h-6 rounded-full bg-tg-text/[0.08] flex items-center justify-center text-tg-text hover:bg-tg-text/[0.15] active:scale-90 transition-all shrink-0"
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Botón de Filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-[48px] h-[48px] rounded-[16px] flex items-center justify-center flex-shrink-0 active:scale-95 transition-all duration-300 border shadow-sm ${
            showFilters || hasActiveFilters
              ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent'
              : 'bg-tg-secondary border-tg-border/50 text-tg-text hover:bg-tg-text/[0.03]'
          }`}
          title={t('filters_and_sort')}
        >
          <SlidersHorizontal size={20} className={hasActiveFilters && !showFilters ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* ── Panel Colapsable de Filtros ── */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          showFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* Este overflow-hidden es necesario para que el truco del grid funcione */}
        <div className="overflow-hidden">
          <div className="pt-2 pb-1 space-y-5">
            
            {/* ── Píldoras de Categoría ── */}
            <div>
              <h3 className="text-[11px] font-extrabold text-tg-hint uppercase  px-1 mb-2.5">
                {t('filter_by_category')}
              </h3>
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                <button
                  onClick={() => onCategoryChange('all')}
                  className={`flex-shrink-0 px-4 py-2 rounded-[14px] text-[13px] font-extrabold transition-all active:scale-95 border ${
                    category === 'all'
                      ? 'bg-tg-accent border-tg-accent text-white shadow-[0_4px_12px_rgba(var(--tg-accent-rgb),0.3)]'
                      : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-tg-text/[0.03]'
                  }`}
                >
                  {t('all_count', { count: total })}
                </button>
                
                {cats.map((c) => {
                  const meta = CATEGORY_META[c] ?? { label: c, color: '#6b7280', icon: '📦' };
                  const isActive = category === c;
                  const isComponent = typeof meta.icon !== 'string';
                  
                  return (
                    <button
                      key={c}
                      onClick={() => onCategoryChange(isActive ? 'all' : c)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-[14px] text-[13px] font-bold transition-all active:scale-95 flex items-center gap-2 border ${
                        isActive
                          ? 'shadow-sm'
                          : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-tg-text/[0.03]'
                      }`}
                      style={
                        isActive 
                          ? { 
                              backgroundColor: `${meta.color}15`, 
                              borderColor: `${meta.color}30`, 
                              color: meta.color 
                            } 
                          : undefined
                      }
                    >
                      <span className={`flex items-center justify-center ${isActive ? '' : 'opacity-60 grayscale'}`}>
                        {typeof meta.icon !== 'string' ? (
                          <meta.icon size={16} style={{ color: isActive ? meta.color : undefined }} />
                        ) : (
                          <span className="text-[14px]">{meta.icon}</span>
                        )}
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Segmented Control de Ordenamiento ── */}
            <div>
              <h3 className="text-[11px] font-extrabold text-tg-hint uppercase  px-1 mb-2.5">
                {t('sort_list')}
              </h3>
              <div className="flex bg-tg-text/[0.03] p-1.5 rounded-[14px] border border-tg-border/30 shadow-inner">
                {([['alpha', t('sort_alpha')], ['category', t('sort_category')]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onSortChange(key)}
                    className={`flex-1 text-[12px] font-extrabold px-3 py-2 rounded-[10px] transition-all active:scale-[0.98] ${
                      sort === key
                        ? 'bg-tg-secondary text-tg-text shadow-sm border border-tg-border/50'
                        : 'text-tg-hint hover:text-tg-text hover:bg-tg-text/[0.02]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      
    </div>
  );
}