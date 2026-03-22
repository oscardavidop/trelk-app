import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORY_META, cmdSlug } from '../../data/botCommands';
import { Compass, ChevronRight } from 'lucide-react';
import { useTelegram } from '../../hooks/useTelegram';
import { getRelated } from '../../services/commandSimilarity';

interface Props {
  /** Slug of the current command — related commands are computed automatically. */
  slug: string;
}

export default function RelatedCommands({ slug }: Props) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const commands = getRelated(slug, 4);

  if (!commands.length) return null;

  return (
    <section className="px-5 mt-8">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <Compass size={16} className="text-tg-hint/60" /> Comandos relacionados
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm animate-slide-up">
        <div className="flex flex-col">
          {commands.map((cmd) => {
            const slug = cmdSlug(cmd);
            const cat = CATEGORY_META[cmd.category];
            const CatIcon = cat?.icon;
            
            // Verificamos si es un componente de Lucide o un string
            const isComponent = typeof CatIcon !== 'string';

            return (
              <button
                key={slug}
                onClick={() => {
                  haptic?.impactOccurred('light');
                  navigate(`/users/ui/${userId}/bot-commands/${slug}`);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0 group"
              >
                
                {/* ── Icono ── */}
                <div
                  className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95"
                  style={{ backgroundColor: `${cat?.color}15`, border: `1px solid ${cat?.color}20` }}
                >
                  {isComponent && CatIcon ? (
                    // @ts-ignore
                    <CatIcon size={18} style={{ color: cat?.color }} />
                  ) : (
                    <span className="text-[16px] drop-shadow-sm">{CatIcon}</span>
                  )}
                </div>
                
                {/* ── Textos ── */}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text font-mono truncate leading-tight">
                    /{slug}
                  </div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">
                    {cmd.description}
                  </div>
                </div>
                
                {/* ── Flecha ── */}
                <ChevronRight 
                  size={18} 
                  className="text-tg-hint/40 flex-shrink-0" 
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}