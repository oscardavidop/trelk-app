import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore, useUserStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import { Search, Check } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';
import { useConfigStore } from '@/stores/config';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'nl', name: 'Nederlands' },
];

export default function LangPage() {
  const { t, i18n } = useTranslation();
  const showToast = useToastStore((s) => s.show);
  const { haptic } = useTelegram();
  const { saveLocale } = useConfigStore();
  const { user, updateConfig } = useUserStore(); // Solo necesitamos el locale del usuario para mostrar el seleccionado inicialmente

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(i18n.language || 'en');


  const filtered = useMemo(() => {
    if (!search) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter((l) => l.name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = async (code: string) => {
    if (selected === code) return; // Evita llamadas extra si ya está seleccionado

    haptic?.selectionChanged();
    setSelected(code);
    i18n.changeLanguage(code);

    try {

      const result = await saveLocale({ lang: code });
      if (result.ok) {
        showToast(t('common:changes_saved'), 'success');
        updateConfig({
          config: {
            ...(user as any)?.authUser?.config,
            locale: {
              ...(user as any)?.authUser?.config?.locale,
              lang: code
            }
          }
        });
      } else {
        showToast(t('common:error'), 'error');
      }
    } catch {
      showToast(t('common:error'), 'error');
    }
  };

  return (
    <div className="pb-28 animate-fade-in relative">
      <StickyHeader title={t('settings:lang_title')} subtitle={t('settings:lang_subtitle')} />

      {/* ── Barra de Búsqueda Estilo iOS ── */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-tg-secondary border border-tg-border/40 rounded-[14px] shadow-sm transition-colors focus-within:border-tg-accent/50 focus-within:bg-tg-secondary/80">
          <Search className="w-[18px] h-[18px] text-tg-hint flex-shrink-0" />
          <input
            type="search"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/70 outline-none"
            placeholder={t('search_placeholder') || 'Search language...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── Lista de Idiomas Agrupada ── */}
      <section className="mt-8 px-5 pb-6">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
          {t('choose_language')}
        </h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex flex-col">
            {filtered.length > 0 ? (
              filtered.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-tg-text leading-tight truncate">
                      {lang.name}
                    </div>
                    {/* El texto secundario muestra el idioma traducido al idioma actual de la UI */}
                    <div className="text-[13px] font-medium text-tg-hint mt-0.5 truncate">
                      {t(lang.code)}
                    </div>
                  </div>

                  {/* Indicador de Selección Nativo */}
                  <div className="flex-shrink-0 ml-3 flex items-center justify-center w-6 h-6">
                    {selected === lang.code && (
                      <Check size={20} className="text-tg-accent animate-fade-in" strokeWidth={3} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              /* Estado sin resultados */
              <div className="p-6 text-center text-tg-hint text-[14px] font-medium">
                {t('common:no_results') || 'No languages found'}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}