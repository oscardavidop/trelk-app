import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore } from '../stores';
import { BOT_COMMANDS, findCommand, cmdSlug, CATEGORY_META } from '../data/botCommands';
import { 
  Heart, Copy, Share, Send, AlertTriangle, 
  Hash, MessageSquare, Lock, Settings2, 
  Flag, ArrowLeft, ArrowRight, CheckCircle2, 
  Star
} from 'lucide-react';

/* ─── Mock screenshots for preview ─── */
const MOCK_SCREENSHOTS = [
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+1',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+2',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+3',
];

export default function BotCommandDetailPage() {
  const { command: slug, userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);

  const cmd = slug ? findCommand(slug) : undefined;
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [reported, setReported] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ─── Navigation helpers ─── */
  const currentIdx = cmd ? BOT_COMMANDS.findIndex((c) => cmdSlug(c) === cmdSlug(cmd)) : -1;
  const prevCmd = currentIdx > 0 ? BOT_COMMANDS[currentIdx - 1] : undefined;
  const nextCmd = currentIdx < BOT_COMMANDS.length - 1 ? BOT_COMMANDS[currentIdx + 1] : undefined;

  const goTo = useCallback((s: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${s}`, { replace: true });
  }, [navigate, userId, haptic]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      haptic?.notificationOccurred('success');
      showToast('Copiado al portapapeles', 'success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      haptic?.notificationOccurred('error');
    }
  }, [haptic, showToast]);

  /* ─── Estado: No Encontrado ─── */
  if (!cmd) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 px-5 text-center animate-fade-in pb-24">
        <div className="w-20 h-20 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-5 shadow-sm">
          <AlertTriangle size={36} className="text-tg-hint/40" />
        </div>
        <h1 className="text-[22px] font-bold text-tg-text tracking-tight mb-2">Comando no encontrado</h1>
        <p className="text-tg-hint text-[14px]">El comando <span className="font-mono text-tg-text">/{slug}</span> no está registrado en el bot.</p>
        <button
          onClick={() => navigate(`/users/ui/${userId}/bot-commands`, { replace: true })}
          className="mt-8 px-6 py-3 rounded-[16px] bg-tg-secondary border border-tg-border/50 text-tg-text font-bold text-[14px] active:scale-95 transition-all shadow-sm"
        >
          Volver al Directorio
        </button>
      </div>
    );
  }

  const cat = CATEGORY_META[cmd.category] ?? { label: cmd.category, color: '#6b7280', icon: '📦' };
  const mainSlug = cmdSlug(cmd);

  return (
    <div className="pb-24 animate-fade-in relative">
      
      {/* ── Hero Header ── */}
      <section className="relative px-5 pt-8 pb-5 border-b border-white/5 bg-gradient-to-b from-tg-secondary/30 to-transparent">
        <div className="flex items-start gap-4">
          <div
            className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center flex-shrink-0 text-[32px] shadow-inner ring-[4px] ring-tg-bg"
            style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
          >
            <span className="drop-shadow-sm">
                <cat.icon className="w-8 h-8" style={{ color: cat.color }} />
            </span>
          </div>
          
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-[26px] font-extrabold text-tg-text font-mono tracking-tight leading-none truncate">/{mainSlug}</h1>
            <p className="text-[14px] font-medium text-tg-hint/90 mt-2 leading-relaxed">{cmd.description}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3.5">
              <span
                className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm"
                style={{ color: cat.color, background: `${cat.color}15`, border: `1px solid ${cat.color}20` }}
              >
                {cat.label}
              </span>
              {cmd.supportsInline && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20">
                  Inline
                </span>
              )}
              {cmd.requireArgs && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full text-amber-500 bg-amber-500/10 border border-amber-500/20">
                  Args Requeridos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fav button */}
        <button
          onClick={() => { setIsFav(!isFav); haptic?.impactOccurred('light'); }}
          className="absolute top-8 right-5 w-10 h-10 rounded-full bg-black/20 border border-white/5 flex items-center justify-center active:scale-90 transition-all hover:bg-white/[0.04]"
        >
          <Heart size={20} className={`transition-colors ${isFav ? 'text-pink-500 fill-pink-500' : 'text-tg-hint/70'}`} />
        </button>
      </section>

      {/* ── Botón de Acción Rápida (Ejecutar) ── */}
      <section className="px-5 mt-6">
        <button
          onClick={() => {
            window.open(`https://t.me/TrelkBot?start=${mainSlug}`, '_blank');
            haptic?.impactOccurred('medium');
          }}
          className="w-full py-4 rounded-[20px] bg-tg-accent text-white text-[16px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(var(--tg-accent-rgb),0.35)] hover:brightness-110"
        >
          <Send size={20} className="fill-white/20" />
          Ejecutar en Telegram
        </button>
      </section>

      {/* ── Bloque de Uso (Usage) ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest px-2 mb-2">Uso del Comando</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <code className="text-[15px] font-mono font-bold text-tg-text tracking-tight truncate">{cmd.usage}</code>
            <button
              onClick={() => copyText(cmd.usage)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all active:scale-95 flex-shrink-0 ml-3 ${
                copied ? 'bg-emerald-500/15 text-emerald-400' : 'bg-tg-accent/10 text-tg-accent hover:bg-tg-accent/20'
              }`}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Aliases ── */}
      <section className="px-5 mt-6">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest px-2 mb-2">Aliases Permitidos</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2.5">
            {cmd.name.map((alias) => (
              <button
                key={alias}
                onClick={() => copyText(`/${alias}`)}
                className="px-3.5 py-1.5 rounded-[12px] bg-black/20 border border-white/5 text-[14px] font-mono font-medium text-tg-text/90 active:scale-95 transition-all hover:border-white/10"
              >
                /{alias}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parámetros (Ajustes Estilo iOS) ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest px-2 mb-2">Detalles Técnicos</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 overflow-hidden shadow-sm">
          <div className="divide-y divide-white/5">
            
            {/* Row: Argumentos */}
            <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-inner ${cmd.requireArgs ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <Hash size={18} className={cmd.requireArgs ? 'text-amber-500' : 'text-emerald-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text tracking-tight">
                  {cmd.requireArgs ? 'Argumentos Requeridos' : 'Sin Argumentos'}
                </div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">
                  {cmd.requireArgs ? 'Necesitas escribir texto después del comando.' : 'Funciona enviando solo el comando.'}
                </div>
              </div>
            </div>

            {/* Row: Inline */}
            {cmd.supportsInline && (
              <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-[12px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <MessageSquare size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-tg-text tracking-tight">Soporta Modo Inline</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">Escribe <span className="font-mono text-tg-text/80">@TrelkBot {mainSlug}</span> en cualquier chat.</div>
                </div>
              </div>
            )}

            {/* Row: Solo Privado */}
            {cmd.supportInGroups === false && (
              <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Lock size={18} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-tg-text tracking-tight">Chat Privado Únicamente</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">Este comando no se puede usar dentro de grupos.</div>
                </div>
              </div>
            )}

            {/* Row: Max Length */}
            {cmd.maxLengthArgs != null && (
              <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-[12px] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Settings2 size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-tg-text tracking-tight">Límite de {cmd.maxLengthArgs} caracteres</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">Restricción de longitud para los argumentos enviados.</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest px-2 mb-3">Vista previa</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {MOCK_SCREENSHOTS.map((src, i) => (
            <div key={i} className="flex-shrink-0 w-[180px] h-[320px] rounded-[24px] overflow-hidden bg-tg-secondary border border-white/5 shadow-md">
              <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="px-5 mt-4">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest px-2 mb-2">Cómo funciona</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 shadow-sm">
          <div className="space-y-5">
            {[
              { step: '1', text: `Envía ${cmd.usage.split(' ')[0]} seguido de los argumentos necesarios.` },
              { step: '2', text: 'El bot procesa tu solicitud instantáneamente.' },
              { step: '3', text: 'Recibes la respuesta estructurada en el chat.' },
            ].map(({ step, text }, i, arr) => (
              <div key={step} className="flex items-start gap-3.5 relative">
                {/* Línea conectora */}
                {i !== arr.length - 1 && <div className="absolute left-[13px] top-8 bottom-[-20px] w-[2px] bg-white/5" />}
                
                <div className="w-7 h-7 rounded-[10px] bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5 z-10">
                  <span className="text-[13px] font-black text-tg-accent">{step}</span>
                </div>
                <p className="text-[14px] font-medium text-tg-text/90 leading-relaxed pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Share & Rate ── */}
      <section className="px-5 mt-6 grid grid-cols-2 gap-3">
        {/* Compartir */}
        <button
          onClick={() => {
            const text = encodeURIComponent(`¡Prueba el comando /${mainSlug} en @TrelkBot!`);
            window.open(`https://t.me/share/url?url=https://t.me/TrelkBot&text=${text}`, '_blank');
            haptic?.impactOccurred('light');
          }}
          className="w-full py-3.5 rounded-[16px] bg-tg-secondary border border-tg-border/50 text-tg-text text-[14px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-white/[0.02]"
        >
          <Share size={18} className="text-tg-hint" />
          Compartir
        </button>
        
        {/* Reportar */}
        <button
          onClick={() => { setReported(true); haptic?.notificationOccurred('success'); showToast('Reporte enviado', 'success'); }}
          disabled={reported}
          className={`w-full py-3.5 rounded-[16px] border text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
            reported 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
              : 'bg-tg-secondary border-tg-border/50 text-tg-text active:scale-95 hover:bg-white/[0.02]'
          }`}
        >
          {reported ? <CheckCircle2 size={18} /> : <Flag size={18} className="text-tg-hint" />}
          {reported ? 'Reportado' : 'Reportar Error'}
        </button>
      </section>

      {/* ── Calificar Comando ── */}
      <section className="px-5 mt-3">
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/50 p-5 text-center shadow-sm">
          {hasRated ? (
            <div className="py-1 animate-scale-in">
              <Star size={32} className="mx-auto text-amber-400 fill-amber-400 mb-2" />
              <p className="text-[15px] font-bold text-tg-text">¡Gracias por calificar!</p>
              <p className="text-[13px] font-medium text-tg-hint mt-1">Le diste {rating} estrella{rating > 1 ? 's' : ''}</p>
            </div>
          ) : (
            <>
              <p className="text-[14px] font-bold text-tg-text mb-3">¿Qué te parece este comando?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setRating(n); setHasRated(true); haptic?.notificationOccurred('success'); }}
                    className="w-12 h-12 rounded-[14px] bg-black/20 border border-white/5 flex items-center justify-center text-[22px] active:scale-90 transition-all hover:bg-amber-500/10 hover:border-amber-500/30 group"
                  >
                    <Star size={24} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-tg-hint/30 group-hover:text-amber-400/50'} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Navigation (Anterior / Siguiente) ── */}
      <section className="px-5 mt-8">
        <div className="flex gap-3">
          {prevCmd ? (
            <button
              onClick={() => goTo(cmdSlug(prevCmd))}
              className="flex-1 bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 text-left active:scale-[0.96] transition-all hover:bg-white/[0.02] shadow-sm group"
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-tg-hint uppercase tracking-widest mb-1.5">
                <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Anterior
              </div>
              <div className="text-[15px] font-bold text-tg-text font-mono truncate">/{cmdSlug(prevCmd)}</div>
            </button>
          ) : <div className="flex-1" />}

          {nextCmd ? (
            <button
              onClick={() => goTo(cmdSlug(nextCmd))}
              className="flex-1 bg-tg-secondary rounded-[20px] border border-tg-border/50 p-4 text-right active:scale-[0.96] transition-all hover:bg-white/[0.02] shadow-sm group"
            >
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-tg-hint uppercase tracking-widest mb-1.5">
                Siguiente <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-[15px] font-bold text-tg-text font-mono truncate">/{cmdSlug(nextCmd)}</div>
            </button>
          ) : <div className="flex-1" />}
        </div>
      </section>

    </div>
  );
}