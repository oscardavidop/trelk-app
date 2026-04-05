import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore, useUserStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import { Search, Check, Clock, Sparkles } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';
import { useConfigStore } from '@/stores/config';
import { useApiError } from '@/hooks/useApiError';

const TIMEZONES: Record<string, { label: string; description: string }> = {
  'GMT-12': { label: 'GMT-12', description: 'Baker Island, Howland Island' },
  'GMT-11': { label: 'GMT-11', description: 'American Samoa, Midway Islands' },
  'GMT-10': { label: 'GMT-10', description: 'Hawaii, Cook Islands, Tahiti' },
  'GMT-9': { label: 'GMT-9', description: 'Alaska' },
  'GMT-8': { label: 'GMT-8', description: 'Pacific Time (US & Canada)' },
  'GMT-7': { label: 'GMT-7', description: 'Mountain Time (US & Canada)' },
  'GMT-6': { label: 'GMT-6', description: 'Central Time (US & Canada), Mexico City' },
  'GMT-5': { label: 'GMT-5', description: 'Colombia, Ecuador, Panamá, Perú' },
  'GMT-4': { label: 'GMT-4', description: 'Eastern Time (US & Canada), Caracas' },
  'GMT-3': { label: 'GMT-3', description: 'Buenos Aires, Montevideo, São Paulo' },
  'GMT-2': { label: 'GMT-2', description: 'South Georgia, South Sandwich Islands' },
  'GMT-1': { label: 'GMT-1', description: 'Azores, Cape Verde Islands' },
  'GMT+0': { label: 'GMT+0', description: 'London, Dublin, Lisbon' },
  'GMT+1': { label: 'GMT+1', description: 'Central European Time, West Africa Time' },
  'GMT+2': { label: 'GMT+2', description: 'Eastern European Time, Central Africa Time' },
  'GMT+3': { label: 'GMT+3', description: 'Moscow, Nairobi, Baghdad' },
  'GMT+4': { label: 'GMT+4', description: 'Dubai, Baku, Samara' },
  'GMT+5': { label: 'GMT+5', description: 'Pakistan Standard Time, Yekaterinburg' },
  'GMT+5:30': { label: 'GMT+5:30', description: 'India Standard Time, Sri Lanka' },
  'GMT+6': { label: 'GMT+6', description: 'Bangladesh Standard Time, Bhutan' },
  'GMT+7': { label: 'GMT+7', description: 'Indochina Time (Thailand, Vietnam, Cambodia)' },
  'GMT+8': { label: 'GMT+8', description: 'China, Singapore, Perth' },
  'GMT+9': { label: 'GMT+9', description: 'Japan, Korea' },
  'GMT+10': { label: 'GMT+10', description: 'Sydney, Vladivostok, Guam' },
  'GMT+11': { label: 'GMT+11', description: 'Solomon Islands, New Caledonia' },
  'GMT+12': { label: 'GMT+12', description: 'Fiji, Marshall Islands, Auckland' },
};

function detectTimezone(): { key: string; name: string } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '';
    const key = `GMT${sign}${offset}`;
    return { key, name: tz };
  } catch {
    return null;
  }
}

export default function TimezonePage() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.show);
  const { haptic } = useTelegram();
  const { user, updateConfig: updateUserConfig } = useUserStore();
  const { saveLocale } = useConfigStore();
  const { handleError } = useApiError();


  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState((user as any)?.authUser?.config?.locale?.tz); // Usa la zona horaria del config o detectada, o GMT+0 como fallback
  const detected = useMemo(() => detectTimezone(), []);

  const tzEntries = useMemo(() => Object.entries(TIMEZONES), []);

  const filtered = useMemo(() => {
    if (!search) return tzEntries;
    const q = search.toLowerCase();
    return tzEntries.filter(
      ([, tz]) =>
        tz.label.toLowerCase().includes(q) || tz.description.toLowerCase().includes(q),
    );
  }, [search, tzEntries]);

  const handleSelect = async (key: string) => {
    if (selected === key) return;

    haptic?.selectionChanged();
    setSelected(key);
    try {
      const result = await saveLocale({ tz: key });
      if (result.ok) {
        showToast(t('common:changes_saved', 'Changes saved'), 'success');
        updateUserConfig({
          config: {
            ...(user as any)?.authUser?.config,
            locale: {
              ...(user as any)?.authUser?.config?.locale,
              tz: key
            }
          }
        });
      } else {
        showToast(t('common:error', 'Error'), 'error');
      }
    } catch (error: any) {
      handleError(error);
    }
  };

  return (
    <div className="pb-28 animate-fade-in relative">
      <StickyHeader title={t('settings:timezone', 'Timezone')} subtitle={t('settings:timezone_desc', 'Set your local time')} />

      {/* ── Barra de Búsqueda Estilo iOS ── */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-tg-secondary border border-tg-border/40 rounded-[14px] shadow-sm transition-colors focus-within:border-tg-accent/50 focus-within:bg-tg-secondary/80">
          <Search className="w-[18px] h-[18px] text-tg-hint flex-shrink-0" />
          <input
            type="search"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/70 outline-none"
            placeholder={t('search_timezone', 'Search timezone...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── Detected Timezone (Oculto si hay búsqueda activa) ── */}
      {detected && !search && (
        <section className="mt-8 px-5">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" /> {t('detected_timezone', 'Detected Timezone')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
            <button
              onClick={() => handleSelect(detected.key)}
              className="w-full flex items-center justify-between p-3.5 text-left active:bg-tg-hint/10 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight flex items-center gap-2">
                    {detected.name.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[13px] font-medium text-tg-hint mt-0.5 truncate">
                    {TIMEZONES[detected.key]?.description || detected.key}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3 flex items-center justify-center w-6 h-6">
                {selected === detected.key && (
                  <Check size={20} className="text-tg-accent animate-fade-in" strokeWidth={3} />
                )}
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ── All Timezones ── */}
      <section className="mt-8 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
          {t('choose_timezone', 'Choose Timezone')}
        </h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex flex-col">
            {filtered.length > 0 ? (
              filtered.map(([key, tz]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-tg-text leading-tight flex items-center gap-2">
                      {tz.label}
                    </div>
                    <div className="text-[13px] font-medium text-tg-hint mt-0.5 truncate">
                      {tz.description}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-3 flex items-center justify-center w-6 h-6">
                    {selected === key && (
                      <Check size={20} className="text-tg-accent animate-fade-in" strokeWidth={3} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-tg-hint text-[14px] font-medium">
                {t('common:no_results', 'No timezones found')}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}