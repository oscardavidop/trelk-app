import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Flag, Camera, Send, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { submitReport } from '@/services/commandStatsApi';

const REPORT_TYPES = [
  { id: 'bug', labelKey: 'report_bug' },
  { id: 'wrong-result', labelKey: 'report_wrong_result' },
  { id: 'crash', labelKey: 'report_crash' },
  { id: 'other', labelKey: 'report_other' },
];

interface Props {
  commandSlug: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ReportErrorModal({ commandSlug, open, onClose, onSubmit }: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('commandDetail');

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
      {/* ── Fondo Oscurecido con Blur ── */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* ── Contenedor del Modal ── */}
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] bg-tg-secondary rounded-t-[24px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl sm:animate-scale-in animate-slide-up border border-tg-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (Solo móvil) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-tg-hint/30" />
        </div>

        {/* ── Header ── */}
        <div className="px-5 pt-3 pb-4 border-b border-tg-border/20 flex-shrink-0 bg-tg-secondary z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-tg-text leading-tight">{t('report_error', 'Report Error')}</h3>
              <p className="text-[13px] font-mono font-medium text-tg-hint mt-1 truncate max-w-[250px]">
                {t('report_command', 'Command')}: <span className="font-bold text-tg-text">/{commandSlug}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-full bg-tg-hint/10 flex items-center justify-center text-tg-hint hover:bg-tg-hint/20 active:scale-95 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sent ? (
            /* ── Estado de Éxito ── */
            <div className="p-10 text-center animate-scale-in flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="w-[72px] h-[72px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 shadow-sm">
                <CheckCircle2 size={36} className="text-emerald-500" strokeWidth={2.5} />
              </div>

              <p className="text-[20px] font-bold text-tg-text mb-1">
                {t('report_sent', 'Report Sent')}
              </p>

              <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[250px]">
                {t('report_thanks', 'Thank you for helping us improve!')}
              </p>
            </div>
          ) : (
            /* ── Formulario ── */
            <div className="p-5 space-y-6">

              {/* Referencia comando */}
              <div className="flex items-center gap-3 bg-tg-hint/5 border border-tg-border/30 px-3.5 py-3 rounded-[14px] shadow-sm">
                <AlertTriangle size={16} className="text-tg-hint/70" />
                <div className="text-[13px] font-medium text-tg-hint">
                  {t('report_affected_command', 'Affected command')}:
                  <span className="font-mono font-bold text-tg-text ml-1.5">
                    /{commandSlug}
                  </span>
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 block pl-1">
                  {t('report_what_happened', 'What happened?')}
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
                        className={`p-3 rounded-[14px] text-[13px] font-semibold transition-all duration-200 text-left border active:scale-[0.98] ${
                          active
                            ? 'bg-tg-accent/10 border-tg-accent/30 text-tg-accent shadow-sm'
                            : 'bg-tg-bg border-tg-border/40 text-tg-hint hover:bg-tg-hint/5'
                        }`}
                      >
                        {t(rt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalles */}
              <div>
                <label className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 block pl-1">
                  {t('report_details', 'Details')}
                </label>

                <div className="relative">
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder={t('report_describe', 'Please describe the issue in detail...')}
                    className="w-full bg-tg-bg border border-tg-border/40 rounded-[16px] p-4 pb-8 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none resize-none focus:border-tg-accent/50 focus:ring-1 focus:ring-tg-accent/20 transition-all shadow-sm"
                  />

                  <div
                    className={`absolute bottom-3 right-4 text-[11px] font-bold ${
                      details.length > 450 ? 'text-red-400' : 'text-tg-hint/50'
                    }`}
                  >
                    {details.length}/500
                  </div>
                </div>
              </div>

              {/* Screenshots */}
              <div>
                <label className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center pl-1">
                  {t('report_screenshots', 'Screenshots')}
                  <span className="text-tg-hint/50 font-medium normal-case ml-1.5 text-[11px]">
                    ({t('common:optional', 'Optional')})
                  </span>
                </label>

                <div className="flex gap-3 flex-wrap">
                  {screenshots.map((s, i) => (
                    <div
                      key={i}
                      className="relative w-[72px] h-[72px] rounded-[14px] bg-tg-bg border border-tg-border/40 flex items-center justify-center shadow-sm"
                    >
                      <Camera size={20} className="text-tg-hint/40" />

                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 border-2 border-tg-secondary flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                      >
                        <X size={12} className="text-white" strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {screenshots.length < 3 && (
                    <button
                      onClick={addScreenshot}
                      className="w-[72px] h-[72px] rounded-[14px] border-2 border-dashed border-tg-border/40 bg-tg-hint/5 flex flex-col items-center justify-center active:scale-95 transition-transform hover:bg-tg-hint/10"
                    >
                      <Camera size={18} className="text-tg-hint/50 mb-1" />
                      <span className="text-[10px] font-bold text-tg-hint/60 uppercase tracking-wider">
                        {t('common:add', 'Add')}
                      </span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!sent && (
          <div className="p-5 border-t border-tg-border/20 bg-tg-secondary flex-shrink-0 z-10">
            <button
              onClick={handleSubmit}
              disabled={!details.trim() || sending}
              className="w-full py-3.5 rounded-[16px] bg-red-500 text-white text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className="fill-white/20" />
              )}
              {sending ? t('report_sending', 'Sending...') : t('report_submit', 'Submit Report')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}