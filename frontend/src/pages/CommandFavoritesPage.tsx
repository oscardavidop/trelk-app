import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { useToastStore } from '../stores';
import { BOT_COMMANDS, CATEGORY_META, cmdSlug, findCommand } from '../data/botCommands';
import { FAVORITE_COMMANDS, COMMAND_FOLDERS } from '../data/commandMocks';
import {
  Star, Pin, FolderPlus, HeartOff, ArrowUpDown,
  ChevronRight, Search, Folder, Music, Brain, Wrench
} from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

const FOLDER_ICONS: Record<string, typeof Music> = { music: Music, brain: Brain, wrench: Wrench };

type SortKey = 'recent' | 'alpha' | 'popular';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recientes' },
  { key: 'alpha', label: 'A-Z' },
  { key: 'popular', label: 'Más usados' },
];

export default function CommandFavoritesPage() {
  useHideIsland();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [favs, setFavs] = useState<string[]>(FAVORITE_COMMANDS);
  const [showFolders, setShowFolders] = useState(true);

  const go = (slug: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${slug}`);
  };

  const removeFav = (slug: string) => {
    setFavs((f) => f.filter((s) => s !== slug));
    haptic?.notificationOccurred('warning');
    showToast('Eliminado de favoritos', 'info');
  };

  const filtered = useMemo(() => {
    let list = favs
      .map((s) => findCommand(s))
      .filter(Boolean) as typeof BOT_COMMANDS;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.some((n) => n.includes(q)) || c.description.toLowerCase().includes(q),
      );
    }

    if (sort === 'alpha') list.sort((a, b) => cmdSlug(a).localeCompare(cmdSlug(b)));
    return list;
  }, [favs, search, sort]);

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title="Favoritos" subtitle={`${favs.length} comandos guardados`} icon={<Star className="h-6 w-6 text-pink-500 fill-pink-500/20" />} />
      {/* ── Buscador + Ordenamiento ── */}
      <div className="px-5 mt-2 flex gap-2.5">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar favoritos…"
            className="w-full bg-tg-text/[0.03] border border-tg-border/40 rounded-[16px] py-3.5 pl-10 pr-4 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none focus:border-tg-accent/40 transition-colors shadow-inner"
          />
        </div>
        
        <button
          onClick={() => {
            haptic?.impactOccurred('light');
            setSort((s) => SORT_OPTIONS[(SORT_OPTIONS.findIndex((o) => o.key === s) + 1) % SORT_OPTIONS.length].key);
          }}
          className="h-full px-4 bg-tg-secondary border border-tg-border/50 rounded-[16px] flex items-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-tg-text/[0.02]"
        >
          <ArrowUpDown size={15} className="text-tg-accent" />
          <span className="text-[13px] font-bold text-tg-text">{SORT_OPTIONS.find((o) => o.key === sort)?.label}</span>
        </button>
      </div>

      {/* ── Carpetas (Carrusel) ── */}
      {showFolders && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-widest">Carpetas</h2>
            <button onClick={() => setShowFolders(false)} className="text-[12px] font-bold text-tg-accent hover:brightness-125 transition-colors">
              Ocultar
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {COMMAND_FOLDERS.map((folder) => {
              const Icon = FOLDER_ICONS[folder.icon] ?? Folder;
              return (
                <button
                  key={folder.id}
                  className="flex-shrink-0 bg-tg-secondary border border-tg-border/50 rounded-[20px] p-4 min-w-[140px] text-left active:scale-[0.96] transition-transform shadow-sm hover:bg-tg-text/[0.02] group"
                >
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3 shadow-inner transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${folder.color}15`, border: `1px solid ${folder.color}20` }}
                  >
                    <Icon size={18} style={{ color: folder.color }} />
                  </div>
                  <div className="text-[14px] font-bold text-tg-text tracking-tight truncate">{folder.name}</div>
                  <div className="text-[11px] font-medium text-tg-hint mt-0.5">{folder.commands.length} comandos</div>
                </button>
              );
            })}
            
            {/* ── Botón Nueva Carpeta ── */}
            <button className="flex-shrink-0 border-2 border-dashed border-tg-border/40 bg-tg-text/[0.01] hover:bg-tg-text/[0.03] rounded-[20px] p-4 min-w-[110px] flex flex-col items-center justify-center active:scale-95 transition-all group">
              <div className="w-10 h-10 rounded-full bg-tg-text/[0.04] flex items-center justify-center mb-2 group-hover:bg-tg-accent/10 transition-colors">
                <FolderPlus size={18} className="text-tg-hint group-hover:text-tg-accent transition-colors" />
              </div>
              <span className="text-[12px] font-bold text-tg-hint group-hover:text-tg-text transition-colors">Nueva</span>
            </button>
          </div>
        </section>
      )}

      {/* ── Lista de Comandos ── */}
      <section className="mt-6 px-5">
        <h2 className="text-[13px] font-bold text-tg-hint uppercase tracking-widest mb-3 px-1">
          Todos ({filtered.length})
        </h2>

        {filtered.length > 0 ? (
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
            <div className="divide-y divide-tg-border/50">
              {filtered.map((cmd) => {
                const slug = cmdSlug(cmd);
                const cat = CATEGORY_META[cmd.category];
                const CatIcon = cat?.icon;
                const isComponent = typeof CatIcon !== 'string';

                return (
                  <div key={slug} className="flex items-center justify-between p-4 transition-colors hover:bg-tg-text/[0.02] group">
                    
                    {/* Área clickeable principal */}
                    <button
                      onClick={() => go(slug)}
                      className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${cat?.color}15`, border: `1px solid ${cat?.color}20` }}
                      >
                        {isComponent && CatIcon ? (
                          // @ts-ignore
                          <CatIcon size={18} style={{ color: cat?.color }} />
                        ) : (
                          <span className="text-[16px] drop-shadow-sm">{CatIcon}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="text-[15px] font-bold text-tg-text font-mono tracking-tight truncate">/{slug}</div>
                        <div className="text-[12px] font-medium text-tg-hint truncate mt-0.5">{cmd.description}</div>
                      </div>
                    </button>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 pl-3">
                      <button 
                        className="w-8 h-8 rounded-[10px] bg-tg-text/[0.04] border border-tg-border/30 flex items-center justify-center active:scale-90 transition-all hover:bg-tg-text/[0.08] hover:text-tg-text"
                        title="Fijar"
                      >
                        <Pin size={14} className="text-tg-hint/70 hover:text-tg-text transition-colors" />
                      </button>
                      
                      <button
                        onClick={() => removeFav(slug)}
                        className="w-8 h-8 rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center active:scale-90 transition-all hover:bg-red-500/20"
                        title="Eliminar de favoritos"
                      >
                        <HeartOff size={14} className="text-red-400" />
                      </button>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Estado Vacío ── */
          <div className="text-center py-16 bg-tg-secondary border border-tg-border/50 rounded-[20px] shadow-sm px-5">
            <div className="w-16 h-16 mx-auto bg-tg-text/[0.03] border border-tg-border/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Star size={32} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-extrabold text-tg-text tracking-tight">Sin resultados</p>
            <p className="text-[13px] font-medium text-tg-hint/80 mt-1.5 leading-relaxed max-w-[200px] mx-auto">
              {search ? 'No encontramos ningún comando que coincida con tu búsqueda.' : 'Aún no tienes comandos guardados en tus favoritos.'}
            </p>
          </div>
        )}
      </section>
      
    </div>
  );
}