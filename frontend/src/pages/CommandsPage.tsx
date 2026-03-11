import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, Plus, Trash2, Search, ChevronRight, Cpu } from 'lucide-react';
import { useConfigStore } from '../stores/config';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';

export default function CommandsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commands');
  const showToast = useToastStore((s) => s.show);

  const { config, loading, load, saveCommand, removeCommand } = useConfigStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newEngine, setNewEngine] = useState('default');

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  const commands = config?.commands ?? {};
  const entries = Object.entries(commands).filter(([k]) =>
    !search || k.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    const key = newKey.trim().replace(/^\//, '').replace(/\s+/g, '_').toLowerCase();
    if (!key) return;
    try {
      await saveCommand(key, { engine: newEngine });
      showToast(t('command_created'), 'success');
      setNewKey('');
      setShowAdd(false);
      haptic?.notificationOccurred('success');
    } catch {
      showToast(t('common:create_error'), 'error');
      haptic?.notificationOccurred('error');
    }
  };

  const handleDelete = async (key: string) => {
    if (window.confirm(t('confirm_delete_command', { key }))) {
      try {
        await removeCommand(key);
        showToast(t('common:deleted'), 'success');
        haptic?.notificationOccurred('success');
      } catch {
        showToast(t('common:delete_error'), 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="w-8 h-8 border-3 border-tg-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="pb-24 animate-fade-in relative">
      
      {/* ── Intro (Estilo Hero) ── */}
      <div className="relative pt-8 pb-6 px-6 text-center bg-gradient-to-b from-tg-accent/10 to-transparent border-b border-white/5">
        <div className="w-20 h-20 mx-auto rounded-[24px] bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(var(--tg-accent-rgb),0.3)] ring-4 ring-tg-accent/20">
          <Terminal className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <h1 className="text-[24px] font-extrabold text-tg-text ">{t('title')}</h1>
        <p className="text-tg-hint text-[14px] max-w-[280px] mx-auto mt-2 leading-relaxed">
          {t('commands_desc')}
        </p>
      </div>

      {/* ── Buscador Pegajoso (Sticky) ── */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-tg-bg/90 backdrop-blur-xl border-b border-tg-border/30">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/20 border border-white/5 rounded-[14px] shadow-inner focus-within:border-tg-accent/40 transition-colors">
          <Search className="w-5 h-5 text-tg-hint shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/60 outline-none"
            placeholder={t('search_command')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="px-4 mt-5">
        
        {/* Título de Sección */}
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  pl-2 mb-2">
          {t('command_list', { count: entries.length })}
        </h2>

        {/* ── Contenedor Principal Estilo iOS ── */}
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-lg animate-slide-up">
          <div className="divide-y divide-tg-border/20">
            
            {/* ── Botón Agregar Comando ── */}
            <div className="bg-tg-secondary">
              <button
                className={`w-full flex items-center gap-3 p-4 transition-colors active:bg-white/[0.02] ${
                  showAdd ? 'bg-tg-accent/5' : ''
                }`}
                onClick={() => { setShowAdd(!showAdd); haptic?.impactOccurred('light'); }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  showAdd ? 'bg-tg-accent text-white' : 'bg-tg-accent/15 text-tg-accent'
                }`}>
                  <Plus className={`w-5 h-5 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
                </div>
                <span className={`text-[15px] font-bold ${showAdd ? 'text-tg-text' : 'text-tg-accent'}`}>
                  {t('common:add_command')}
                </span>
              </button>

              {/* ── Formulario Desplegable ── */}
              <div className={`grid transition-all duration-300 ease-in-out ${showAdd ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden bg-black/10 border-t border-white/5">
                  <div className="p-4 space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-tg-hint/70 uppercase  pl-1">{t('command_label')}</label>
                      <div className="flex items-center gap-2 px-3.5 py-3 bg-tg-surface rounded-[14px] border border-white/5 focus-within:border-tg-accent/40 transition-colors">
                        <span className="text-tg-hint/50 font-mono font-bold text-[16px]">/</span>
                        <input
                          className="w-full bg-transparent text-[15px] text-tg-text outline-none font-mono placeholder:text-tg-hint/40 placeholder:font-sans"
                          placeholder="ej: my_command"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-tg-hint/70 uppercase  pl-1">{t('engine_label')}</label>
                      <div className="relative">
                        <select
                          className="w-full bg-tg-surface rounded-[14px] px-3.5 py-3 text-[15px] text-tg-text outline-none border border-white/5 appearance-none focus:border-tg-accent/40 transition-colors"
                          value={newEngine}
                          onChange={(e) => setNewEngine(e.target.value)}
                        >
                          <option value="default">Default Engine</option>
                          <option value="inline">Inline Engine</option>
                          <option value="webhook">Webhook Engine</option>
                          <option value="script">Script Engine</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tg-hint/50">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        className="flex-1 py-3 rounded-[14px] text-[14px] font-bold bg-white/[0.08] text-tg-text hover:bg-white/[0.12] active:scale-95 transition-all"
                        onClick={() => setShowAdd(false)}
                      >
                        {t('common:cancel')}
                      </button>
                      <button
                        className="flex-1 py-3 rounded-[14px] text-[14px] font-bold bg-tg-accent text-white shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        onClick={handleAdd}
                        disabled={!newKey.trim()}
                      >
                        <Terminal size={16} /> {t('common:create')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lista de Comandos Existentes ── */}
            {entries.length === 0 && !showAdd && (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <Terminal className="w-10 h-10 text-tg-hint/20 mb-3" />
                <p className="text-tg-text font-medium text-[14px]">{t('no_commands')}</p>
                <p className="text-tg-hint text-[12px] mt-1">{t('tap_add_command')}</p>
              </div>
            )}
            
            {entries.map(([key, cmd]) => (
              <div key={key} className="flex items-center justify-between p-0 hover:bg-white/[0.02] transition-colors group">
                
                {/* Zona cliqueable para entrar al detalle */}
                <div 
                  className="flex-1 flex items-start gap-3.5 p-4 min-w-0 cursor-pointer"
                  onClick={() => {
                    haptic?.impactOccurred('light');
                    navigate(`/users/ui/${userId}/commands/${key}`);
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-tg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4 text-tg-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[15px] font-bold text-tg-text font-mono truncate ">/{key}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] font-medium text-tg-hint/90 bg-black/20 px-2 py-0.5 rounded-md">
                        {cmd.engine}
                      </span>
                      {cmd.inline && (
                        <>
                          <span className="text-tg-hint/30 text-[10px]">•</span>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            inline
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Botones de acción derecha */}
                <div className="flex items-center gap-1 pr-3">
                  <button
                    className="w-10 h-10 rounded-full flex items-center justify-center text-tg-hint/50 hover:bg-red-500/10 hover:text-red-400 active:scale-90 transition-all flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(key); }}
                    title={t('delete_command')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-tg-hint/50" />
                </div>

              </div>
            ))}
          </div>
        </div>
        
        {/* Footer Text */}
        <div className="mt-6 px-2 text-center flex items-start gap-2 justify-center">
          <Terminal className="w-4 h-4 text-tg-hint/60 shrink-0 mt-0.5" />
          <p className="text-[13px] text-tg-hint leading-relaxed max-w-[280px]">
            {t('commands_footer')}
          </p>
        </div>
      </div>
    </main>
  );
}