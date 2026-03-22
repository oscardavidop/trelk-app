import { Copy, ChevronDown, ChevronUp, Code, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommandExample } from '../../data/commandMocks';
import { useTelegram } from '../../hooks/useTelegram';

interface Props {
  examples: CommandExample[];
}

export default function CommandExamples({ examples }: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const [expanded, setExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  if (!examples.length) return null;

  const visible = expanded ? examples : examples.slice(0, 3);

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    haptic?.notificationOccurred('success');
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleExpand = () => {
    haptic?.impactOccurred('light');
    setExpanded(!expanded);
  };

  return (
    <section className="px-5 mt-8 pb-2">
      <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pl-1">
        <Code size={16} className="text-tg-hint/60" /> {t('usage_examples', 'Usage Examples')}
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm animate-slide-up">
        <div className="flex flex-col">
          {visible.map((ex, i) => (
            <div key={i} className="p-4 border-b border-tg-border/20 last:border-0 transition-colors active:bg-tg-hint/5">
              
              {/* ── Descripción del ejemplo ── */}
              <div className="mb-2">
                <span className="text-[14px] font-medium text-tg-text leading-snug">
                  {ex.description}
                </span>
              </div>
              
              {/* ── Bloque de Código y Copiar ── */}
              <div className="flex items-center gap-2.5">
                <code className="flex-1 text-[13px] font-mono text-tg-text bg-tg-hint/10 border border-tg-border/30 rounded-[12px] px-3.5 py-2.5 truncate shadow-sm">
                  {ex.text}
                </code>
                
                <button
                  onClick={() => copyText(ex.text, i)}
                  className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 active:scale-95 transition-all duration-200 border shadow-sm ${
                    copiedIndex === i
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-tg-hint/10 border-tg-border/30 text-tg-hint hover:text-tg-text hover:bg-tg-hint/20'
                  }`}
                  title="Copiar comando"
                >
                  {copiedIndex === i ? (
                    <CheckCircle2 size={16} strokeWidth={3} className="animate-scale-in" />
                  ) : (
                    <Copy size={16} strokeWidth={2} />
                  )}
                </button>
              </div>
              
            </div>
          ))}
        </div>
      </div>
      
      {/* ── Botón Ver Más / Menos ── */}
      {examples.length > 3 && (
        <button
          onClick={toggleExpand}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-full bg-tg-accent/10 text-[14px] font-semibold text-tg-accent active:scale-95 transition-transform duration-200 shadow-sm"
        >
          {expanded ? (
            <>
              {t('hide_examples', 'Show less')}
              <ChevronUp size={18} strokeWidth={2.5} /> 
            </>
          ) : (
            <>
              {t('show_more', { count: examples.length - 3, defaultValue: `Show ${examples.length - 3} more` })}
              <ChevronDown size={18} strokeWidth={2.5} /> 
            </>
          )}
        </button>
      )}
      
    </section>
  );
}