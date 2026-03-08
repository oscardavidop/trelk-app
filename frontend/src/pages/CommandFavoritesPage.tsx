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
    <div className="pb-16 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight">Comandos Favoritos</h1>
        <p className="text-[13px] text-tg-hint mt-1">{favs.length} comandos guardados</p>
      </div>

      {/* Search + Sort */}
      <div className="px-5 mt-3 flex gap-2.5">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar favoritos…"
            className="w-full bg-tg-secondary border border-tg-border/20 rounded-[14px] py-3 pl-10 pr-4 text-[14px] text-tg-text placeholder-tg-hint/40 outline-none focus:border-tg-accent/40 transition-colors"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setSort((s) => SORT_OPTIONS[(SORT_OPTIONS.findIndex((o) => o.key === s) + 1) % SORT_OPTIONS.length].key)}
            className="h-full px-3.5 bg-tg-secondary border border-tg-border/20 rounded-[14px] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <ArrowUpDown size={15} className="text-tg-hint" />
            <span className="text-[12px] font-bold text-tg-text">{SORT_OPTIONS.find((o) => o.key === sort)?.label}</span>
          </button>
        </div>
      </div>

      {/* Folders */}
      {showFolders && (
        <section className="mt-5 px-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest">Carpetas</h2>
            <button onClick={() => setShowFolders(false)} className="text-[11px] text-tg-hint">Ocultar</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {COMMAND_FOLDERS.map((folder) => {
              const Icon = FOLDER_ICONS[folder.icon] ?? Folder;
              return (
                <button
                  key={folder.id}
                  className="flex-shrink-0 bg-tg-secondary border border-tg-border/20 rounded-[16px] p-3.5 min-w-[140px] text-left active:scale-[0.97] transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2"
                    style={{ background: `${folder.color}15` }}
                  >
                    <Icon size={17} style={{ color: folder.color }} />
                  </div>
                  <div className="text-[13px] font-bold text-tg-text">{folder.name}</div>
                  <div className="text-[11px] text-tg-hint mt-0.5">{folder.commands.length} comandos</div>
                </button>
              );
            })}
            {/* Add folder */}
            <button className="flex-shrink-0 border-2 border-dashed border-tg-border/30 rounded-[16px] p-3.5 min-w-[100px] flex flex-col items-center justify-center active:scale-95 transition-all">
              <FolderPlus size={20} className="text-tg-hint/50 mb-1" />
              <span className="text-[11px] font-bold text-tg-hint/60">Nueva</span>
            </button>
          </div>
        </section>
      )}

      {/* Command list */}
      <section className="mt-5 px-5">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-2.5">
          Todos ({filtered.length})
        </h2>

        {filtered.length > 0 ? (
          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/20 overflow-hidden">
            <div className="divide-y divide-tg-border/10">
              {filtered.map((cmd) => {
                const slug = cmdSlug(cmd);
                const cat = CATEGORY_META[cmd.category];
                const CatIcon = cat?.icon;
                return (
                  <div key={slug} className="flex items-center gap-3 p-3.5">
                    <button
                      onClick={() => go(slug)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                    >
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${cat?.color}15` }}
                      >
                        {CatIcon && <CatIcon size={18} style={{ color: cat?.color }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold text-tg-text font-mono truncate">/{slug}</div>
                        <div className="text-[11px] text-tg-hint truncate mt-0.5">{cmd.description}</div>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="w-8 h-8 rounded-[10px] bg-tg-surface/20 flex items-center justify-center active:scale-90 transition-all">
                        <Pin size={13} className="text-tg-hint/60" />
                      </button>
                      <button
                        onClick={() => removeFav(slug)}
                        className="w-8 h-8 rounded-[10px] bg-red-500/10 flex items-center justify-center active:scale-90 transition-all"
                      >
                        <HeartOff size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Star size={32} className="mx-auto text-tg-hint/20 mb-3" />
            <p className="text-[14px] font-bold text-tg-text">Sin resultados</p>
            <p className="text-[12px] text-tg-hint mt-1">
              {search ? 'Intenta con otra búsqueda' : 'Aún no tienes comandos favoritos'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
