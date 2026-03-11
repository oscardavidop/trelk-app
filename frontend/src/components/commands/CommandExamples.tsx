import { Play, Copy, ChevronDown, ChevronUp, Code, CheckCircle2 } from 'lucide-react';
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

  if (!examples.length) return null;

  return (
    <section className="px-5 mt-8 pb-4">
      <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-3 flex items-center gap-1.5 px-1">
        <Code size={14} className="text-tg-accent" /> {t('usage_examples')}
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
        <div className="divide-y divide-tg-border/50">
          {visible.map((ex, i) => (
            <div key={i} className="p-2 px-3 transition-colors hover:bg-tg-text/[0.02] group">
              
              {/* ── Descripción del ejemplo ── */}
              <div className="mb-2.5">
                <span className="text-[13px] font-medium text-tg-text/90 leading-snug">
                  {ex.description}
                </span>
              </div>
              
              {/* ── Bloque de Código y Copiar ── */}
              <div className="flex items-center gap-2.5">
                <code className="flex-1 text-[13px] font-mono text-tg-text bg-tg-text/[0.03] border border-tg-border/30 rounded-[12px] px-3.5 py-2.5 truncate shadow-inner">
                  {ex.text}
                </code>
                
                <button
                  onClick={() => copyText(ex.text, i)}
                  className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all border ${
                    copiedIndex === i
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-tg-text/[0.05] border-tg-border/30 text-tg-hint hover:text-tg-text hover:bg-tg-text/[0.1]'
                  }`}
                  title="Copiar comando"
                >
                  {copiedIndex === i ? (
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  ) : (
                    <Copy size={16} />
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
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-full bg-tg-accent/10 border border-tg-accent/20 text-[13px] font-extrabold text-tg-accent active:scale-95 transition-all hover:bg-tg-accent/15 shadow-sm"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} strokeWidth={2.5} /> 
              {t('hide_examples')}
            </>
          ) : (
            <>
              <ChevronDown size={16} strokeWidth={2.5} /> 
              {t('show_more', { count: examples.length - 3 })}
            </>
          )}
        </button>
      )}
      
    </section>
  );
}