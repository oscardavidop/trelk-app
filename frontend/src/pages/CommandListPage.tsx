import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { BOT_COMMANDS, cmdSlug } from '../data/botCommands';
import CommandCard from '../components/commands/CommandCard';
import CommandFilters, { type SortKey } from '../components/commands/CommandFilters';
import StickyHeader from '../components/StickyHeader';
import { Search } from 'lucide-react';

export default function CommandListPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('cat') || 'all');
  const [sort, setSort] = useState<SortKey>('alpha');

  const filtered = useMemo(() => {
    let list = [...BOT_COMMANDS];

    // Filtro por Categoría
    if (category !== 'all') {
      list = list.filter((c) => c.category === category);
    }

    // Búsqueda de texto
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.some((n) => n.includes(q)) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }

    // Ordenamiento
    if (sort === 'alpha') {
      list.sort((a, b) => cmdSlug(a).localeCompare(cmdSlug(b)));
    } else {
      list.sort((a, b) => a.category.localeCompare(b.category) || cmdSlug(a).localeCompare(cmdSlug(b)));
    }

    return list;
  }, [search, category, sort]);

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Cabecera Pegajosa y Filtros ── */}
      <StickyHeader title="Todos los Comandos" subtitle={`${BOT_COMMANDS.length} comandos disponibles`}>
        <div className="px-5 mt-3 pb-3">
          <CommandFilters
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            total={BOT_COMMANDS.length}
          />
        </div>
      </StickyHeader>

      {/* ── Lista de Comandos ── */}
      <div className="px-5 mt-4">
        {filtered.length === 0 ? (
          
          /* Estado: No se encontraron resultados */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4 shadow-sm">
              <Search size={32} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-bold text-tg-text tracking-tight">No se encontraron comandos</p>
            <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 leading-relaxed max-w-[250px]">
              Intenta con otra palabra clave o cambia la categoría en los filtros.
            </p>
          </div>
          
        ) : (
          
          /* Contenedor de la Lista (Estilo iOS Settings) */
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
            <div className="divide-y divide-white/5">
              {filtered.map((cmd) => (
                <CommandCard 
                  key={cmdSlug(cmd)} 
                  cmd={cmd} 
                  onClick={go} 
                  compact 
                />
              ))}
            </div>
          </div>
          
        )}
      </div>
      
    </div>
  );
}