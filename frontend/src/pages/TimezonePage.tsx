import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { updateConfig } from '../services/api';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import SectionHeader from '../components/SectionHeader';
import { Search } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

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

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
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
    haptic?.selectionChanged();
    setSelected(key);
    try {
      await updateConfig({ tz: key });
      showToast(t('common:changes_saved'), 'success');
    } catch {
      showToast(t('common:error'), 'error');
    }
  };

  return (
    <div className="tm-main pb-8 animate-fade-in">
      <StickyHeader title={t('settings:timezone')} subtitle={t('settings:timezone_desc')} />

      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="tm-search-field">
          <Search className="w-5 h-5 text-tg-hint flex-shrink-0" />
          <input
            type="search"
            className="tm-input text-[15px]"
            placeholder={t('search_timezone')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Detected timezone */}
      {detected && (
        <>
          <SectionHeader title={t('detected_timezone')} />
          <div className="mx-4">
            <label
              className="tm-row cursor-pointer"
              onClick={() => handleSelect(detected.key)}
            >
              <div className={`tm-checkbox ${selected === detected.key ? 'checked' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] text-tg-text">{detected.name}</div>
                <div className="text-[13px] text-tg-hint mt-0.5">
                  {TIMEZONES[detected.key]?.description || detected.key}
                </div>
              </div>
            </label>
          </div>
        </>
      )}

      {/* All timezones */}
      <SectionHeader title={t('choose_timezone')} />
      <div className="mx-4">
        {filtered.map(([key, tz]) => (
          <label
            key={key}
            className="tm-row cursor-pointer"
            onClick={() => handleSelect(key)}
          >
            <div className={`tm-checkbox ${selected === key ? 'checked' : ''}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] text-tg-text">{tz.label}</div>
              <div className="text-[13px] text-tg-hint mt-0.5">{tz.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
