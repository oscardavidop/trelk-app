import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Camera, Send, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { submitReport } from '@/services/commandStatsApi';

const REPORT_TYPES = [
  { id: 'bug', label: 'Bug / Error visual' },
  { id: 'wrong-result', label: 'Resultado incorrecto' },
  { id: 'crash', label: 'Comando no responde' },
  { id: 'other', label: 'Otro problema' },
];

interface Props {
  commandSlug: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ReportErrorModal({ commandSlug, open, onClose, onSubmit }: Props) {
  const { haptic } = useTelegram();

  const [type, setType] = useState('bug');
  const [details, setDetails] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  /* ── Bloquear scroll del body ── */
  useEffect(() => {
    if (!open) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open]);

  if (!open) return null;

  const addScreenshot = () => {
    if (screenshots.length < 3) {
      haptic?.impactOccurred('light');
      setScreenshots([...screenshots, `screenshot_${screenshots.length + 1}.png`]);
    }
  };

  const removeScreenshot = (idx: number) => {
    haptic?.impactOccurred('light');
    setScreenshots(screenshots.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!details.trim() || details.trim().length < 10) return;

    haptic?.impactOccurred('medium');
    setSending(true);

    try {
      const category = type.replace('-', '_'); // wrong-result → wrong_result
      await submitReport(commandSlug, category, details.trim());
      setSending(false);
      setSent(true);
      haptic?.notificationOccurred('success');

      setTimeout(() => {
        onSubmit();
        onClose();

        setTimeout(() => {
          setSent(false);
          setDetails('');
          setType('bug');
          setScreenshots([]);
        }, 300);
      }, 1500);
    } catch (err: any) {
      setSending(false);
      haptic?.notificationOccurred('error');
      // Show inline error or just reset
    }
  };
  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* ── Fondo Oscurecido ── */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* ── Contenedor del Modal ── */}
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] bg-tg-bg rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl sm:animate-scale-in animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (Solo móvil) */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
        </div>

        {/* ── Header ── */}
        <div className="px-5 pt-2 pb-4 border-b border-tg-border/50 flex-shrink-0 bg-tg-bg/95 backdrop-blur-md z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-tg-text tracking-tight">Reportar Error</h3>
              <p className="text-[12px] font-mono text-tg-hint/80 mt-0.5 truncate max-w-[250px]">
                Comando: <span className="font-bold text-tg-text">/{commandSlug}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-tg-secondary flex items-center justify-center text-tg-hint hover:bg-tg-accent/10 hover:text-tg-accent active:scale-95 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {sent ? (
            <div className="p-10 text-center animate-scale-in flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>

              <p className="text-[18px] font-extrabold text-tg-text tracking-tight">
                ¡Reporte enviado!
              </p>

              <p className="text-[14px] font-medium text-tg-hint mt-1.5 leading-relaxed">
                Gracias por ayudarnos a mejorar Trelk Bot.
              </p>
            </div>
          ) : (
            <div className="p-5 overflow-y-auto space-y-5 no-scrollbar">

              {/* Referencia comando */}
              <div className="flex items-center gap-2 bg-tg-text/[0.03] border border-tg-border/30 px-3 py-2.5 rounded-[12px]">
                <AlertTriangle size={14} className="text-tg-hint/70" />

                <div className="text-[12px] font-medium text-tg-hint">
                  Comando afectado:
                  <span className="font-mono font-bold text-tg-text ml-1">
                    /{commandSlug}
                  </span>
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-[11px] font-extrabold text-tg-hint uppercase tracking-widest mb-2.5 block px-1">
                  ¿Qué ocurrió?
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {REPORT_TYPES.map((rt) => {
                    const active = type === rt.id;

                    return (
                      <button
                        key={rt.id}
                        onClick={() => {
                          setType(rt.id);
                          haptic?.selectionChanged();
                        }}
                        className={`p-3 rounded-[14px] text-[13px] font-bold transition-all text-left border ${active
                            ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent shadow-sm'
                            : 'bg-tg-secondary border-tg-border/50 text-tg-hint hover:bg-tg-text/[0.02]'
                          }`}
                      >
                        {rt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalles */}
              <div>
                <label className="text-[11px] font-extrabold text-tg-hint uppercase tracking-widest mb-2.5 block px-1">
                  Detalles del problema
                </label>

                <div className="relative">
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Describe qué ocurrió..."
                    className="w-full bg-tg-text/[0.02] border border-tg-border/40 rounded-[16px] p-4 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none resize-none focus:border-tg-accent/40 transition-colors shadow-inner"
                  />

                  <div
                    className={`absolute bottom-3 right-3 text-[10px] font-bold ${details.length > 450 ? 'text-red-400' : 'text-tg-hint/50'
                      }`}
                  >
                    {details.length}/500
                  </div>
                </div>
              </div>

              {/* Screenshots */}
              <div>
                <label className="text-[11px] font-extrabold text-tg-hint uppercase tracking-widest mb-2.5 block px-1">
                  Capturas
                  <span className="text-tg-hint/50 font-medium normal-case ml-1">
                    (opcional)
                  </span>
                </label>

                <div className="flex gap-2.5 flex-wrap">
                  {screenshots.map((s, i) => (
                    <div
                      key={i}
                      className="relative w-[70px] h-[70px] rounded-[14px] bg-tg-secondary border border-tg-border/50 flex items-center justify-center shadow-sm"
                    >
                      <Camera size={20} className="text-tg-hint/30" />

                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 border-2 border-tg-bg flex items-center justify-center"
                      >
                        <X size={12} className="text-white" strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {screenshots.length < 3 && (
                    <button
                      onClick={addScreenshot}
                      className="w-[70px] h-[70px] rounded-[14px] border-2 border-dashed border-tg-border/40 bg-tg-text/[0.01] flex flex-col items-center justify-center"
                    >
                      <Camera size={18} className="text-tg-hint/50 mb-1" />

                      <span className="text-[10px] font-bold text-tg-hint/60">
                        Añadir
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          {!sent && (
            <div className="p-4">
              <button
                onClick={handleSubmit}
                disabled={!details.trim() || sending}
                className="w-full py-3.5 rounded-[16px] bg-red-500 text-white text-[15px] font-extrabold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(239,68,68,0.3)]"
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} className="fill-white/20" />
                )}

                {sending ? 'Enviando reporte...' : 'Enviar Reporte'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )

  return createPortal(content, document.body);
}