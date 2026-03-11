import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import { useConfigStore } from '../stores/config';
import SectionHeader from '../components/SectionHeader';
import { Search, MapPin } from 'lucide-react';

// Diccionario de países. Puedes agregar más si lo necesitas.
const COUNTRIES: Record<string, string> = {
  AR: 'Argentina',
  BO: 'Bolivia',
  BR: 'Brasil',
  CA: 'Canadá',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  DO: 'República Dominicana',
  EC: 'Ecuador',
  SV: 'El Salvador',
  ES: 'España',
  US: 'Estados Unidos',
  GT: 'Guatemala',
  HN: 'Honduras',
  MX: 'México',
  NI: 'Nicaragua',
  PA: 'Panamá',
  PY: 'Paraguay',
  PE: 'Perú',
  PR: 'Puerto Rico',
  UY: 'Uruguay',
  VE: 'Venezuela',
  // ... puedes agregar más códigos ISO aquí
};

async function detectCountry(): Promise<{ code: string; name: string } | null> {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/country.json');
    
    if (!response.ok) return null;

    const data = await response.json();
    const code = data.country;

    if (code && COUNTRIES[code]) {
      return { code, name: COUNTRIES[code] };
    }
    
    return null;
  } catch (error) {
    console.error("Error al detectar el país por IP:", error);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('Bogota')) return { code: 'CO', name: COUNTRIES['CO'] };
      if (tz.includes('Madrid')) return { code: 'ES', name: COUNTRIES['ES'] };
      if (tz.includes('Mexico_City')) return { code: 'MX', name: COUNTRIES['MX'] };
      if (tz.includes('Buenos_Aires')) return { code: 'AR', name: COUNTRIES['AR'] };
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
  const { config, load: loadConfig, saveLocale } = useConfigStore();

  const [search, setSearch] = useState('');
  // Inicializamos el estado con el país que ya esté guardado en la configuración
  const [selected, setSelected] = useState(config?.locale?.country || '');
  const [detected, setDetected] = useState<{ code: string; name: string } | null>(null);

  // Cargar configuración inicial si no existe
  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  // Sincronizar el estado local si la configuración cambia remotamente
  useEffect(() => {
    if (config?.locale?.country) {
      setSelected(config.locale.country);
    }
  }, [config?.locale?.country]);

  // Detectar país al montar el componente
  useEffect(() => {
    detectCountry().then(setDetected);
  }, []);
  
  // Convertir el objeto a array y ordenarlo alfabéticamente por el nombre del país
  const countryEntries = useMemo(() => {
    return Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  // Filtrado de la búsqueda
  const filtered = useMemo(() => {
    if (!search) return countryEntries;
    const q = search.toLowerCase();
    return countryEntries.filter(
      ([code, name]) =>
        name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    );
  }, [search, countryEntries]);

  // Función para manejar el guardado
  const handleSelect = async (code: string) => {
    haptic?.selectionChanged();
    setSelected(code);
    try {
      await saveLocale({ country: code });
      showToast(t('settings:country_updated'), 'success'); // Puedes cambiarlo por t('country_saved')
    } catch {
      showToast(t('settings:error_saving_country'), 'error');
    }
  };

  return (
    <div className="tm-main pb-8 animate-fade-in">
      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="tm-search-field">
          <Search className="w-5 h-5 text-tg-hint flex-shrink-0" />
          <input
            type="search"
            className="tm-input text-[15px]"
            placeholder={t('settings:search_country')} // O t('search_country')
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Detected Country */}
      {detected && (
        <>
          <SectionHeader title={t('settings:detected_country')} /> {/* O t('detected_country') */}
          <div className="mx-4">
            <label
              className="tm-row cursor-pointer"
              onClick={() => handleSelect(detected.code)}
            >
              <div className={`tm-checkbox ${selected === detected.code ? 'checked' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] text-tg-text flex items-center gap-2">
                  <span>{detected.name}</span>
                  {/* Etiqueta pequeñita con el código del país, opcional pero se ve bien */}
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-tg-hint">
                    {detected.code}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </>
      )}

      {/* All Countries */}
      <SectionHeader title={t('settings:all_countries')} /> {/* O t('choose_country') */}
      <div className="mx-4">
        {filtered.length > 0 ? (
          filtered.map(([code, name]) => (
            <label
              key={code}
              className="tm-row cursor-pointer"
              onClick={() => handleSelect(code)}
            >
              <div className={`tm-checkbox ${selected === code ? 'checked' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] text-tg-text">{name}</div>
                <div className="text-[13px] text-tg-hint mt-0.5">{code}</div>
              </div>
            </label>
          ))
        ) : (
          /* Estado vacío si no hay resultados en la búsqueda */
          <div className="py-8 text-center text-tg-hint text-[15px]">
            {t('settings:no_countries_found')}
          </div>
        )}
      </div>
    </div>
  );
}