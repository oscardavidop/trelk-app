import { useState } from 'react';
import { Terminal, Play, RotateCcw, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

const MOCK_RESULTS: Record<string, string> = {
  play: 'Reproduciendo: Bohemian Rhapsody - Queen\nDuración: 5:55 | Calidad: 320kbps',
  chatgpt: 'La inteligencia artificial es un campo de la informática que busca crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana.',
  translate: 'Traducción (ES → EN): "Hello, how are you?"',
  ssweb: 'Captura generada exitosamente.\nResolución: 1920x1080 | Formato: PNG',
  img: 'Imagen generada: paisaje futurista\nResolución: 1024x1024 | Modelo: DALL-E 3',
  dl: 'Descargando video...\nTítulo: Never Gonna Give You Up\nFormato: MP4 720p | Tamaño: 24.3MB',
};

interface Props {
  commandSlug: string;
  usage: string;
}

export default function CommandPlayground({ commandSlug, usage }: Props) {
  const { haptic } = useTelegram();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (running) return;
    haptic?.impactOccurred('medium');
    setRunning(true);
    setResult(null);
    
    setTimeout(() => {
      haptic?.notificationOccurred('success');
      setResult(MOCK_RESULTS[commandSlug] ?? `Resultado de /${commandSlug} ${input}\n\nComando ejecutado correctamente.`);
      setRunning(false);
    }, 800);
  };

  const reset = () => {
    haptic?.impactOccurred('light');
    setInput('');
    setResult(null);
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      haptic?.notificationOccurred('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="px-5 mt-8">
      
      <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1">
        <Terminal size={14} className="text-tg-accent" /> Playground Interactivo
      </h2>
      
      <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm flex flex-col">
        
        {/* ── Zona de Input ── */}
        {/* Usamos bg-tg-text/[0.02] para oscurecer sutilmente sin romper el tema claro */}
        <div className="p-4 bg-tg-text/[0.02]">
          <div className="flex items-center gap-2 bg-tg-surface/60 border border-tg-border/40 rounded-[14px] px-3.5 py-3.5 focus-within:border-tg-accent/40 transition-colors shadow-inner">
            <code className="text-[14px] font-mono font-bold text-tg-accent flex-shrink-0 tracking-tight">
              /{commandSlug}
            </code>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="escribe los argumentos..."
              className="flex-1 bg-transparent text-[14px] font-mono text-tg-text placeholder-tg-hint/50 outline-none w-full"
              onKeyDown={(e) => e.key === 'Enter' && run()}
            />
          </div>
          <div className="text-[11px] font-medium text-tg-hint/70 mt-2 font-mono px-1">
            {usage}
          </div>
        </div>

        {/* ── Zona de Resultado (Terminal Display) ── */}
        {result && (
          <div className="p-4 bg-tg-text/[0.04] border-t border-tg-border/40 relative animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              {/* El texto verde puede ser ilegible en modo claro, usamos text-tg-text */}
              <pre className="text-[13px] font-mono text-tg-text/90 whitespace-pre-wrap flex-1 leading-relaxed">
                {result}
              </pre>
              
              <button
                onClick={copyResult}
                className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all border ${
                  copied 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-tg-text/[0.05] border-tg-border/30 text-tg-hint hover:text-tg-text hover:bg-tg-text/[0.1]'
                }`}
                title="Copiar resultado"
              >
                {copied ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* ── Acciones ── */}
        <div className="flex gap-2.5 p-4 border-t border-tg-border/50 bg-tg-secondary">
          <button
            onClick={run}
            disabled={running}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-tg-accent text-white text-[14px] font-extrabold active:scale-[0.98] transition-all disabled:opacity-70 shadow-sm"
          >
            {running ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} className="fill-white/20" />
            )}
            {running ? 'Procesando...' : 'Ejecutar comando'}
          </button>
          
          <button
            onClick={reset}
            className="px-4 py-3.5 rounded-[14px] bg-tg-surface/60 border border-tg-border/40 text-tg-text text-[14px] font-bold flex items-center gap-1.5 active:scale-95 transition-all hover:bg-tg-text/[0.05]"
            title="Limpiar"
          >
            <RotateCcw size={16} className="text-tg-hint" />
          </button>
        </div>

      </div>
    </section>
  );
}