import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Star, Plus, Trash2, Search, Zap } from 'lucide-react';
import { useConfigStore } from '../stores/config';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import Select from '@/components/Select';

const ALLOWED_ALIAS = [
  'chatgpt-premium',
  'gpt4',
  'gpt4-premium',
  'bard-pro',
  'gemini-1.5-pro',
  'custom-model',
];

export default function PremiumCommandsPage() {
  const { userId } = useParams();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);
  const { config, loading, load, savePremiumCommand, removePremiumCommand } = useConfigStore();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newAlias, setNewAlias] = useState('');

  useEffect(() => {
    if (!config) load();
  }, [config, load]);

  const premiumCmds = config?.premium_commands ?? {};
  const entries = Object.entries(premiumCmds).filter(([k]) =>
    !search || k.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    const key = newKey.trim().replace(/^\//, '').replace(/\s+/g, '_').toLowerCase();
    const alias = newAlias.trim();
    if (!key || !alias) return;
    try {
      await savePremiumCommand(key, alias);
      showToast('Comando premium creado', 'success');
      setNewKey('');
      setNewAlias('');
      setShowAdd(false);
      haptic?.notificationOccurred('success');
    } catch {
      showToast('Error al crear', 'error');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await removePremiumCommand(key);
      showToast('Comando eliminado', 'success');
      haptic?.notificationOccurred('warning');
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="pb-12 animate-fade-in relative" style={{ top: 'var(--tg-top-offset, 0px)' }}>
      
      {/* ── Intro Premium (Estilo Hero) ── */}
      <div className="relative pt-8 pb-6 px-6 text-center bg-gradient-to-b from-amber-500/10 to-transparent border-b border-white/5">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] ring-4 ring-amber-500/20">
          <Star className="w-10 h-10 text-white fill-white/20" strokeWidth={2} />
        </div>
        <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight">Comandos Premium</h1>
        <p className="text-tg-hint text-[14px] max-w-[280px] mx-auto mt-2 leading-relaxed">
          Comandos exclusivos con alias personalizados para funcionalidades avanzadas.
        </p>
      </div>

      {/* ── Buscador Pegajoso (Sticky) ── */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-tg-bg/90 backdrop-blur-xl border-b border-tg-border/30">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/20 border border-white/5 rounded-[14px] shadow-inner focus-within:border-amber-500/40 transition-colors">
          <Search className="w-5 h-5 text-tg-hint shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/60 outline-none"
            placeholder="Buscar comando premium..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="px-4 mt-5">
        
        {/* Título de Sección */}
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-widest pl-2 mb-2">
          Gestión ({entries.length})
        </h2>

        {/* ── Contenedor Principal Estilo iOS ── */}
        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-lg">
          <div className="divide-y divide-white/5">
            
            {/* ── Botón Agregar Comando ── */}
            <div className="bg-tg-secondary">
              <button
                className={`w-full flex items-center gap-3 p-4 transition-colors active:bg-white/[0.02] ${
                  showAdd ? 'bg-amber-500/5' : ''
                }`}
                onClick={() => { setShowAdd(!showAdd); haptic?.impactOccurred('light'); }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  showAdd ? 'bg-amber-500 text-white' : 'bg-amber-500/15 text-amber-500'
                }`}>
                  <Plus className={`w-5 h-5 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
                </div>
                <span className={`text-[15px] font-bold ${showAdd ? 'text-tg-text' : 'text-amber-500'}`}>
                  Agregar comando
                </span>
              </button>

              {/* ── Formulario Desplegable ── */}
              <div className={`grid transition-all duration-300 ease-in-out ${showAdd ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden bg-black/10 border-t border-white/5">
                  <div className="p-4 space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-tg-hint/70 uppercase tracking-widest pl-1">Comando (Trigger)</label>
                      <div className="flex items-center gap-2 px-3.5 py-3 bg-tg-surface rounded-[14px] border border-white/5 focus-within:border-amber-500/40 transition-colors">
                        <span className="text-tg-hint/50 font-mono font-bold text-[16px]">/</span>
                        <input
                          className="w-full bg-transparent text-[15px] text-tg-text outline-none font-mono placeholder:text-tg-hint/40 placeholder:font-sans"
                          placeholder="ej: gpt4"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-tg-hint/70 uppercase tracking-widest pl-1">Alias (Modelo IA)</label>
                      <Select
                        options={ALLOWED_ALIAS.map((alias) => ({ label: alias, value: alias }))}
                        onChange={(value) => setNewAlias(value)}
                        value={newAlias}
                        searchable={true}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        className="flex-1 py-3 rounded-[14px] text-[14px] font-bold bg-white/[0.08] text-tg-text hover:bg-white/[0.12] active:scale-95 transition-all"
                        onClick={() => setShowAdd(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        className="flex-1 py-3 rounded-[14px] text-[14px] font-bold bg-amber-500 text-white shadow-md hover:bg-amber-600 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        onClick={handleAdd}
                        disabled={!newKey.trim() || !newAlias.trim()}
                      >
                        <Zap size={16} className="fill-white/20" /> Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lista de Comandos Existentes ── */}
            {entries.length === 0 && !showAdd && (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <Star className="w-10 h-10 text-tg-hint/20 mb-3" />
                <p className="text-tg-text font-medium text-[14px]">No hay comandos configurados</p>
                <p className="text-tg-hint text-[12px] mt-1">Toca en "Agregar comando" para empezar.</p>
              </div>
            )}
            
            {entries.map(([key, cmd]) => (
              <div key={key} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-tg-text font-mono truncate tracking-tight">/{key}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] font-medium text-tg-hint/90 bg-black/20 px-2 py-0.5 rounded-md">
                        {cmd.alias}
                      </span>
                      {cmd.created_at && (
                        <>
                          <span className="text-tg-hint/30 text-[10px]">•</span>
                          <span className="text-[11px] text-tg-hint">
                            {new Date(cmd.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-tg-hint/50 hover:bg-red-500/10 hover:text-red-400 active:scale-90 transition-all flex-shrink-0 ml-3"
                  onClick={() => handleDelete(key)}
                  title="Eliminar comando"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer Text */}
        <div className="mt-6 px-2 text-center flex items-start gap-2 justify-center">
          <Star className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
          <p className="text-[13px] text-tg-hint leading-relaxed max-w-[280px]">
            Los comandos premium están disponibles exclusivamente para usuarios con suscripción activa.
          </p>
        </div>
      </div>
    </main>
  );
}