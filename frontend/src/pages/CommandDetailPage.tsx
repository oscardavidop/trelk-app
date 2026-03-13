import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../stores/config';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import ToggleRow from '../components/ToggleRow';
import CommandFeedback from '../components/commands/CommandFeedback';
import { SkeletonCard } from '../components/skeletons/SkeletonCard';
import { Terminal, Save, Trash2, Cpu, FileJson, AlertTriangle } from 'lucide-react';

export default function CommandDetailPage() {
  const { command, userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commands');
  const showToast = useToastStore((s) => s.show);
  const { config, load, saveCommand, removeCommand } = useConfigStore();

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  const cmd = command ? config?.commands?.[command] : null;

  const [engine, setEngine] = useState(cmd?.engine || 'default');
  const [resultsPerPage, setResultsPerPage] = useState(cmd?.inline?.results_per_page ?? 10);
  const [showUrl, setShowUrl] = useState(cmd?.inline?.show_url ?? true);
  const [saving, setSaving] = useState(false);

  // Sync state when config loads
  useEffect(() => {
    if (cmd) {
      setEngine(cmd.engine);
      setResultsPerPage(cmd.inline?.results_per_page ?? 10);
      setShowUrl(cmd.inline?.show_url ?? true);
    }
  }, [cmd]);

  const handleSave = async () => {
    if (!command) return;
    setSaving(true);
    try {
      await saveCommand(command, {
        engine,
        inline: engine === 'inline' ? { results_per_page: resultsPerPage, show_url: showUrl } : undefined,
      });
      showToast(t('common:changes_saved'), 'success');
      haptic?.notificationOccurred('success');
    } catch {
      showToast(t('common:save_error'), 'error');
      haptic?.notificationOccurred('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!command) return;
    if (window.confirm(t('confirm_delete_command', { key: command }))) {
      try {
        await removeCommand(command);
        showToast(t('common:deleted'), 'success');
        haptic?.notificationOccurred('success');
        navigate(`/users/ui/${userId}/commands`, { replace: true });
      } catch {
        showToast(t('common:delete_error'), 'error');
      }
    }
  };

  // ── ESTADO: CARGANDO ──
  if (!config) {
    return (
      <main className="pb-24 animate-fade-in px-5 pt-10 space-y-4">
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  // ── ESTADO: COMANDO NO ENCONTRADO ──
  if (!cmd) {
    return (
      <main className="pb-24 animate-fade-in flex flex-col items-center justify-center pt-20 px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4">
          <AlertTriangle size={32} className="text-tg-hint/50" />
        </div>
        <h1 className="text-[20px] font-bold text-tg-text  mb-2">{t('command_not_found')}</h1>
        <p className="text-tg-hint text-[14px]">{t('command_not_in_config', { command })}</p>
        <button
          onClick={() => navigate(`/users/ui/${userId}/commands`, { replace: true })}
          className="mt-6 px-6 py-2.5 bg-tg-secondary rounded-full text-tg-accent font-medium text-[14px] active:scale-95 transition-transform"
        >
          {t('back_to_commands')}
        </button>
      </main>
    );
  }

  return (
    <main className="pb-24 animate-fade-in relative">
      
      {/* ── Header ── */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 animate-scale-in">
        <div className="w-20 h-20 rounded-[20px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center mb-4 shadow-inner">
          <Terminal className="w-10 h-10 text-tg-accent" strokeWidth={1.5} />
        </div>
        <h1 className="text-[26px] font-extrabold text-tg-text font-mono  leading-none mb-1">
          /{command}
        </h1>
        <p className="text-[13px] text-tg-hint mt-1 font-mono bg-black/20 px-3 py-1 rounded-full border border-white/5">
          engine: {engine}
        </p>
      </div>

      {/* ── Motor del Comando (Engine) ── */}
      <div className="px-5 mt-2 animate-slide-up">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-2 pl-2 flex items-center gap-1.5">
          <Cpu size={14} className="text-tg-hint/70" /> {t('processing_engine')}
        </h2>
        <div className="rounded-[16px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm focus-within:border-tg-accent/40 transition-colors relative">
          <select
            className="w-full bg-transparent px-4 py-3.5 text-[15px] font-medium text-tg-text outline-none appearance-none cursor-pointer z-10 relative"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
          >
            <option value="default" className="bg-tg-secondary text-tg-text">Default Engine</option>
            <option value="inline" className="bg-tg-secondary text-tg-text">Inline Engine</option>
            <option value="webhook" className="bg-tg-secondary text-tg-text">Webhook Engine</option>
            <option value="script" className="bg-tg-secondary text-tg-text">Script Engine</option>
          </select>
          {/* Flecha personalizada del Select */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tg-hint/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <p className="text-[12px] text-tg-hint/70 px-2 mt-2 leading-relaxed">
          {t('engine_desc')}
        </p>
      </div>

      {/* ── Configuración Inline (Si aplica) ── */}
      {engine === 'inline' && (
        <div className="px-5 mt-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-2 pl-2 flex items-center gap-1.5">
            <FileJson size={14} className="text-tg-hint/70" /> {t('inline_options')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm">
            <div className="divide-y divide-tg-border/20">
              
              {/* Input Number Row */}
              <div className="flex items-center justify-between px-4 py-3 bg-transparent hover:bg-white/[0.01] transition-colors focus-within:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-tg-text/90">{t('results_per_page')}</span>
                </div>
                <input
                  type="number"
                  className="w-16 bg-black/20 border border-white/5 rounded-lg px-2.5 py-1 text-[15px] font-mono text-tg-text text-center outline-none focus:border-tg-accent/40 transition-colors"
                  value={resultsPerPage}
                  min={1}
                  max={50}
                  onChange={(e) => setResultsPerPage(Number(e.target.value))}
                />
              </div>

              {/* Toggle Row Customizado para el estilo actual */}
              <div className="px-1 py-1">
                <ToggleRow
                  label={t('include_url')}
                  enabled={showUrl}
                  onChange={setShowUrl}
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Section ── */}
      <div className="px-5 mt-10 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <div className="w-full h-px bg-tg-border/30 mb-8" />
        <CommandFeedback command={command!} />
      </div>

      {/* ── Acciones de Guardado y Eliminación ── ABAJO */}
      <div className="px-5 mt-10 space-y-3 animate-slide-up bottom-0 relative" style={{ animationDelay: '100ms' }}>
        <button
          className="w-full flex items-center justify-center gap-2 bg-tg-accent text-white rounded-[16px] py-3.5 text-[15px] font-bold shadow-[0_4px_14px_rgba(var(--tg-accent-rgb),0.3)] active:scale-[0.98] transition-all disabled:opacity-70"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? t('common:saving') : t('save_config')}
        </button>
        
        <button
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[16px] py-3.5 text-[14px] font-bold hover:bg-red-500/20 active:scale-[0.98] transition-all"
          onClick={handleDelete}
        >
          <Trash2 size={18} />
          {t('delete_command')}
        </button>
      </div>

    </main>
  );
}