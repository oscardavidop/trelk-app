import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { updateConfig } from '../services/api';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import SectionHeader from '../components/SectionHeader';
import { Search } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

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

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(i18n.language || 'en');

  const filtered = useMemo(() => {
    if (!search) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter((l) => l.name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = async (code: string) => {
    haptic?.selectionChanged();
    setSelected(code);
    i18n.changeLanguage(code);
    try {
      await updateConfig({ lang: code });
      showToast('Changes saved', 'success');
    } catch {
      showToast('Error.', 'error');
    }
  };

  return (
    <div className="tm-main pb-8 animate-fade-in">
      <StickyHeader title="Idioma" subtitle="Selecciona tu idioma preferido" />
      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="tm-search-field">
          <Search className="w-5 h-5 text-tg-hint flex-shrink-0" />
          <input
            type="search"
            className="tm-input text-[15px]"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <SectionHeader title={t('choose_language')} />
      <div className="mx-4">
        {filtered.map((lang) => (
          <label
            key={lang.code}
            className="tm-row cursor-pointer"
            onClick={() => handleSelect(lang.code)}
          >
            <div className={`tm-checkbox ${selected === lang.code ? 'checked' : ''}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] text-tg-text">{lang.name}</div>
              <div className="text-[13px] text-tg-hint mt-0.5">{t(lang.code)}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
