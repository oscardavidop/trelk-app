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
      <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-3 flex items-center gap-1.5 px-1">
        <Compass size={14} className="text-tg-accent" /> Comandos relacionados
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
        <div className="divide-y divide-white/5">
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
                className="w-full flex items-center gap-3.5 p-4 text-left transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] group"
              >
                
                {/* ── Icono ── */}
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
                
                {/* ── Textos ── */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-[15px] font-bold text-tg-text font-mono  truncate">
                    /{slug}
                  </div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 truncate">
                    {cmd.description}
                  </div>
                </div>
                
                {/* ── Flecha ── */}
                <ChevronRight 
                  size={18} 
                  className="text-tg-hint/40 flex-shrink-0 transition-transform group-hover:translate-x-0.5" 
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}