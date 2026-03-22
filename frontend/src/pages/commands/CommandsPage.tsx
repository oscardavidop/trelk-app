import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ChevronRight, X, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StickyHeader from '../../components/StickyHeader';
import { useTelegram } from '../../hooks/useTelegram';
import { commandConfigSchema } from '../../config/commandConfigSchema';
import { fetchUserCommandConfig } from '../../services/commandConfigApi';

const USER_COMMAND_CONFIG_QUERY_KEY = ['user-command-config'];

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export default function CommandsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commands');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: USER_COMMAND_CONFIG_QUERY_KEY,
    queryFn: fetchUserCommandConfig,
    staleTime: 5 * 60 * 1000,
  });

  const entries = useMemo(() => Object.entries(commandConfigSchema), []);

  const filtered = entries.filter(([key, schema]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return key.includes(q) || schema.title.toLowerCase().includes(q) || schema.description.toLowerCase().includes(q);
  });

  return (
    <main className="pb-24 animate-fade-in">
      <StickyHeader
        title={t('command_settings_title')}
        subtitle={t('command_settings_subtitle')}
      />

      {/* ── Buscador ── */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-tg-text/[0.03] border border-tg-border/30 rounded-[16px] shadow-inner focus-within:border-tg-accent/40 focus-within:bg-tg-text/[0.01] transition-all">
          <Search size={18} className="text-tg-hint/70 shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/50 outline-none w-full"
            placeholder={t('search_command_settings')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button 
              onClick={() => { setSearch(''); haptic?.impactOccurred('light'); }} 
              className="w-6 h-6 rounded-full bg-tg-text/[0.08] flex items-center justify-center text-tg-text hover:bg-tg-text/[0.15] active:scale-90 transition-all shrink-0"
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* ── Lista de Comandos Configurables ── */}
      <section className="px-5 mt-6">
        <h2 className="text-[12px] font-extrabold text-tg-hint uppercase tracking-widest pl-1 mb-3 flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-tg-accent" />
          {t('configurable_commands')}
        </h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm animate-slide-up">
          {isLoading ? (
            /* ── Estado de Carga (Skeleton) ── */
            <div className="divide-y divide-tg-border/20">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-tg-text/[0.05] rounded animate-pulse" />
                    <div className="h-3 w-48 bg-tg-text/[0.04] rounded animate-pulse" />
                    <div className="h-5 w-32 bg-tg-text/[0.03] rounded-[6px] animate-pulse mt-1" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-tg-text/[0.03] animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* ── Estado Vacío ── */
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-tg-text/[0.03] border border-tg-border/30 flex items-center justify-center mb-3 shadow-inner">
                <Settings2 size={24} className="text-tg-hint/40" />
              </div>
              <p className="text-[15px] font-extrabold text-tg-text tracking-tight">
                {search ? 'Sin resultados' : t('no_configurable_commands')}
              </p>
              {search && (
                <p className="text-[13px] font-medium text-tg-hint/80 mt-1">
                  Prueba buscando con otras palabras.
                </p>
              )}
            </div>
          ) : (
            /* ── Lista Renderizada ── */
            <div className="divide-y divide-tg-border/30">
              {filtered.map(([commandKey, schema]) => {
                const commandConfig = (data?.commands?.[commandKey] ?? {}) as Record<string, unknown>;

                const summary = schema.fields
                  .map((field) => {
                    const value = getByPath(commandConfig, field.key);
                    if (value === undefined || value === null || value === '') return null;
                    return `${field.label}: ${String(value)}`;
                  })
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(' · ');

                return (
                  <button
                    key={commandKey}
                    onClick={() => {
                      haptic?.impactOccurred('light');
                      navigate(`/users/ui/${userId}/commands/${commandKey}`);
                    }}
                    className="w-full text-left p-4 hover:bg-tg-text/[0.02] active:bg-tg-text/[0.04] transition-colors group flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Título */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-extrabold text-tg-text font-mono tracking-tight">
                          /{commandKey}
                        </span>
                      </div>
                      
                      {/* Descripción */}
                      <p className="text-[13px] font-medium text-tg-hint/90 leading-snug truncate">
                        {schema.description}
                      </p>
                      
                      {/* Resumen de configuración (Badge) */}
                      <div className="mt-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] inline-block max-w-full truncate ${
                          summary 
                            ? 'bg-tg-accent/10 text-tg-accent border border-tg-accent/20' 
                            : 'bg-tg-text/[0.04] text-tg-hint border border-tg-border/30'
                        }`}>
                          {summary || t('no_current_config')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Flecha indicadora */}
                    <ChevronRight size={18} className="text-tg-hint/40 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}