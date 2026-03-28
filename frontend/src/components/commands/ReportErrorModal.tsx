import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Camera, Send, CheckCircle2, Loader2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { submitReport } from '@/services/commandStatsApi';

const REPORT_TYPES = [
  { id: 'bug', labelKey: 'report_bug' },
  { id: 'wrong-result', labelKey: 'report_wrong_result' },
  { id: 'crash', labelKey: 'report_crash' },
  { id: 'other', labelKey: 'report_other' },
];

const MAX_SCREENSHOTS = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MIN_MESSAGE_LENGTH = 10;
const THROTTLE_MS = 10_000; // 10 seconds between submissions

interface Props {
  commandSlug: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ReportErrorModal({ commandSlug, open, onClose, onSubmit }: Props) {
  const { haptic } = useTelegram();
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const { userId } = useParams();

  const [type, setType] = useState('bug');
  const [details, setDetails] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef(0);

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

  /* ── Cleanup previews on unmount ── */
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const addScreenshots = useCallback((files: FileList | null) => {
    if (!files) return;

    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setError(t('report_invalid_file_type'));
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t('report_file_too_large'));
        continue;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (newFiles.length) {
      haptic?.impactOccurred('light');
      setScreenshots((prev) => [...prev, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
      setError(null);
    }
  }, [screenshots.length, haptic, t]);

  const removeScreenshot = useCallback((idx: number) => {
    haptic?.impactOccurred('light');
    URL.revokeObjectURL(previews[idx]);
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }, [haptic, previews]);

  const canSubmit = details.trim().length >= MIN_MESSAGE_LENGTH && !sending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Throttle (10s)
    const now = Date.now();
    if (now - lastSubmitRef.current < THROTTLE_MS) {
      setError(t('report_throttle'));
      haptic?.notificationOccurred('error');
      return;
    }

    haptic?.impactOccurred('medium');
    setSending(true);
    setError(null);
    setUploadProgress(screenshots.length > 0);

    try {
      const category = type.replace('-', '_'); // wrong-result → wrong_result
      await submitReport(commandSlug, category, details.trim(), screenshots.length > 0 ? screenshots : undefined);
      lastSubmitRef.current = Date.now();
      setSending(false);
      setUploadProgress(false);
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
          setPreviews([]);
          setError(null);
        }, 300);
      }, 1500);
    } catch (err: any) {
      setSending(false);
      setUploadProgress(false);
      setError(err?.message || t('report_error_generic'));
      haptic?.notificationOccurred('error');
    }
  };

  if (!open) return null;

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
              <h3 className="text-[18px] font-bold text-tg-text leading-tight">{t('report_error')}</h3>
              <p className="text-[13px] font-mono font-medium text-tg-hint mt-1 truncate max-w-[250px]">
                {t('report_command')}: <span className="font-bold text-tg-text">/{commandSlug}</span>
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
                {t('report_sent')}
              </p>

              <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[250px]">
                {t('report_thanks')}
              </p>

              <button
                onClick={() => {
                  onClose();
                  navigate(`/users/ui/${userId}/my-reports`);
                }}
                className="mt-4 text-[13px] font-semibold text-tg-accent hover:underline"
              >
                {t('view_my_reports')}
              </button>
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

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3.5 py-3 rounded-[14px] animate-scale-in">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-[12px] font-medium text-red-400">{error}</p>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 block pl-1">
                  {t('report_what_happened')}
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
                    placeholder={t('report_describe')}
                    className="w-full bg-tg-bg border border-tg-border/40 rounded-[16px] p-4 pb-8 text-[14px] text-tg-text placeholder-tg-hint/50 outline-none resize-none focus:border-tg-accent/50 focus:ring-1 focus:ring-tg-accent/20 transition-all shadow-sm"
                  />

                  <div className="absolute bottom-3 right-4 flex items-center gap-2">
                    {details.trim().length > 0 && details.trim().length < MIN_MESSAGE_LENGTH && (
                      <span className="text-[10px] font-medium text-amber-400">
                        {t('report_min_chars', 'Min {{count}} chars', { count: MIN_MESSAGE_LENGTH })}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-bold ${
                        details.length > 450 ? 'text-red-400' : 'text-tg-hint/50'
                      }`}
                    >
                      {details.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* Screenshots — Real file upload */}
              <div>
                <label className="text-[12px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 flex items-center pl-1">
                  {t('report_screenshots')}
                  <span className="text-tg-hint/50 font-medium normal-case ml-1.5 text-[11px]">
                    ({t('common:optional', 'Optional')} · {t('report_max_files', 'max {{count}}', { count: MAX_SCREENSHOTS })})
                  </span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    addScreenshots(e.target.files);
                    e.target.value = '';
                  }}
                />

                <div className="flex gap-3 flex-wrap">
                  {previews.map((url, i) => (
                    <div
                      key={i}
                      className="relative w-[72px] h-[72px] rounded-[14px] bg-tg-bg border border-tg-border/40 overflow-hidden shadow-sm"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover"
                      />

                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 border-2 border-tg-secondary flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                      >
                        <X size={12} className="text-white" strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {screenshots.length < MAX_SCREENSHOTS && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-[72px] h-[72px] rounded-[14px] border-2 border-dashed border-tg-border/40 bg-tg-hint/5 flex flex-col items-center justify-center active:scale-95 transition-transform hover:bg-tg-hint/10"
                    >
                      <Camera size={18} className="text-tg-hint/50 mb-1" />
                      <span className="text-[10px] font-bold text-tg-hint/60 uppercase tracking-wider">
                        {t('common:add', 'Add')}
                      </span>
                    </button>
                  )}
                </div>

                {screenshots.length > 0 && (
                  <p className="text-[11px] text-tg-hint/50 mt-2 pl-1 flex items-center gap-1">
                    <ImageIcon size={10} />
                    {screenshots.length}/{MAX_SCREENSHOTS} · {t('report_max_size', 'max 2MB each')}
                  </p>
                )}
              </div>

              {/* Authorizations */}
              <div className="text-[11px] text-tg-hint/90 mt-2 pl-1">
                {t('report_privacy_note', 'By submitting this report, you agree to our')} {' '}
                <a
                  href="https://trelkbot.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tg-accent hover:underline"
                >
                  {t('report_privacy_policy', 'Privacy Policy')}
                </a> and <a href="https://trelkbot.com/terms" target="_blank" rel="noopener noreferrer" className="text-tg-accent hover:underline">{t('report_terms_of_service', 'Terms of Service')}</a>
                . {t('report_no_personal_data', 'We do not collect any personal data without your consent.')}
              </div>  

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!sent && (
          <div className="p-5 border-t border-tg-border/20 bg-tg-secondary flex-shrink-0 z-10">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-[16px] bg-red-500 text-white text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {uploadProgress
                    ? t('report_uploading')
                    : t('report_sending')}
                </>
              ) : (
                <>
                  <Send size={18} className="fill-white/20" />
                  {t('report_submit')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}