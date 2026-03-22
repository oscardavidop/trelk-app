import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore, useUserStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import { useConfigStore } from '../stores/config';
import { Search, MapPin, Check, Sparkles } from 'lucide-react';
import StickyHeader, { StickySectionHeader } from '@/components/StickyHeader';


import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
// countries.registerLocale(enLocale);
// const COUNTRIES: Record<string, string> = countries.getNames('en');


async function detectCountry(countries: Record<string, string>): Promise<{ code: string; name: string } | null> {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/country.json');
    if (!response.ok) return null;
    const data = await response.json();
    const code = data.country;
    if (code && countries[code]) {
      return { code, name: countries[code] };
    }
    return null;
  } catch (error) {
    console.error("Error al detectar el país por IP:", error);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('Bogota')) return { code: 'CO', name: countries['CO'] };
      if (tz.includes('Madrid')) return { code: 'ES', name: countries['ES'] };
      if (tz.includes('Mexico_City')) return { code: 'MX', name: countries['MX'] };
      if (tz.includes('Buenos_Aires')) return { code: 'AR', name: countries['AR'] };
    } catch {
      return null;
    }
    return null;
  }
}

export default function CountryPage() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.show);
  const { haptic } = useTelegram();
  const { saveLocale } = useConfigStore();
  const { user, updateConfig } = useUserStore();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState((user as any)?.authUser?.config?.locale?.country || '');
  const [detected, setDetected] = useState<{ code: string; name: string } | null>(null);

  const [COUNTRIES, setCountries] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadLocale = async () => {
      const lang = (user as any)?.authUser?.config?.locale?.lang || 'en';
      try {
        // Importación dinámica de Webpack/Vite
        const localeData = await import(`../../node_modules/i18n-iso-countries/langs/${lang}.json`);
        countries.registerLocale(localeData.default);
        setCountries(countries.getNames(lang));
      } catch (e) {
        // Fallback a inglés si el idioma no existe
        countries.registerLocale(enLocale);
        setCountries(countries.getNames('en'));
      }
    };

    loadLocale();
  }, [(user as any)?.authUser?.config?.locale?.lang]);

  useEffect(() => {
    detectCountry(COUNTRIES).then(setDetected);
  }, [COUNTRIES]);

  const countryEntries = useMemo(() => {
    return Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));
  }, [COUNTRIES]);

  const filtered = useMemo(() => {
    if (!search) return countryEntries;
    const q = search.toLowerCase();
    return countryEntries.filter(
      ([code, name]) =>
        name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    );
  }, [search, countryEntries]);

  const handleSelect = async (code: string) => {
    if (selected === code) return;

    haptic?.selectionChanged();
    setSelected(code);
    try {
      const result = await saveLocale({ country: code });
      if (result.ok) {
        showToast(t('settings:country_updated', 'Country updated'), 'success');
        updateConfig({
          config: {
            ...(user as any)?.authUser?.config,
            locale: {
              ...(user as any)?.authUser?.config?.locale,
              country: code
            }
          }
        });
      } else {
        showToast(t('common:error'), 'error');
      }
    } catch {
      showToast(t('settings:error_saving_country', 'Error saving'), 'error');
    }
  };

  useEffect(() => {
    if (!selected) return;
    const el = document.getElementById(`country-${selected}`);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    }
  }, [selected]);


  return (
    <div className="pb-28 animate-fade-in relative">
      <StickySectionHeader>
        <StickyHeader title={t('settings:country', 'Country')} subtitle={t('settings:country_desc', 'Select your region')} />
        <div className="px-5">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-tg-secondary border border-tg-border/40 rounded-[14px] shadow-sm transition-colors focus-within:border-tg-accent/50 focus-within:bg-tg-secondary/80 focus-within:border-2">
            <Search className="w-[18px] h-[18px] text-tg-hint flex-shrink-0" />
            <input
              type="search"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/70 outline-none"
              placeholder={t('settings:search_country', 'Search country...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </StickySectionHeader>

      {/* ── Barra de Búsqueda Estilo iOS ── */}


      {/* ── Detected Country (Oculto si hay búsqueda activa) ── */}
      {
        !detected && !search && (
          <section className="mt-8 px-5">
            <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-spin-slow" />
              {t('settings:detected_country', 'Detected')}
            </h2>
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm animate-pulse">
              <div className="w-full flex items-center justify-between p-3.5 text-left">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/20 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-tg-text/10 rounded-full w-24" />
                    <div className="h-2 bg-tg-text/5 rounded-full w-16" />
                  </div>
                  <div className="w-4 h-4 bg-tg-text/10 rounded-full" />
                </div>
              </div>
            </div>
          </section>
        )
      }

      {detected && !search && (
        <section className="mt-8 px-5">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" /> {t('settings:detected_country', 'Detected')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
            <button
              onClick={() => handleSelect(detected.code)}
              className="w-full flex items-center justify-between p-3.5 text-left active:bg-tg-hint/10 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight flex items-center gap-2">
                    {detected.name}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-tg-hint/10 text-tg-hint border border-tg-border/40 uppercase tracking-wider">
                      {detected.code}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3 flex items-center justify-center w-6 h-6">
                {selected === detected.code && (
                  <Check size={20} className="text-tg-accent animate-fade-in" strokeWidth={3} />
                )}
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ── All Countries ── */}
      <section className="mt-8 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
          {t('settings:all_countries', 'All Countries')}
        </h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex flex-col">
            {filtered.length > 0 ? (
              filtered.map(([code, name]) => (
                <button
                  id={`country-${code}`}
                  key={code}
                  onClick={() => handleSelect(code)}
                  className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-tg-text leading-tight">
                      {name}
                    </div>
                    <div className="text-[13px] font-medium text-tg-hint mt-0.5">
                      {code}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-3 flex items-center justify-center w-6 h-6">
                    {selected === code && (
                      <Check size={20} className="text-tg-accent animate-fade-in" strokeWidth={3} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-tg-hint text-[14px] font-medium">
                {t('settings:no_countries_found', 'No countries found')}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}