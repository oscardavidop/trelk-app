import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Camera, Send, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

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

  const handleSubmit = () => {
    if (!details.trim()) return;

    haptic?.impactOccurred('medium');
    setSending(true);

    setTimeout(() => {
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
    }, 1200);
  };

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">

      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Modal ── */}
      <div
        className="relative w-full max-w-[360px] bg-tg-bg rounded-[24px] border border-tg-border/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tg-border/30 bg-tg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-inner">
              <Flag size={16} className="text-red-500" />
            </div>

            <h2 className="text-[17px] font-extrabold text-tg-text tracking-tight">
              Reportar Error
            </h2>
          </div>

          <button
            onClick={() => {
              haptic?.impactOccurred('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-tg-text/[0.05] border border-tg-border/30 flex items-center justify-center hover:bg-tg-text/[0.1] active:scale-90 transition-all"
          >
            <X size={16} className="text-tg-hint" />
          </button>
        </div>

        {/* ── Body ── */}
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
                      className={`p-3 rounded-[14px] text-[13px] font-bold transition-all text-left border ${
                        active
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
                  className={`absolute bottom-3 right-3 text-[10px] font-bold ${
                    details.length > 450 ? 'text-red-400' : 'text-tg-hint/50'
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
          <div className="p-4 border-t border-tg-border/30 bg-tg-secondary/30">
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
  );

  return createPortal(content, document.body);
}