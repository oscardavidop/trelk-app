import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ─── Mode Configuration ──────────────────────────────────────────────
// "expand"  → namespace files loaded individually (future lazy-loading ready)
// "compact" → all namespaces merged into one resource object per language
const I18N_MODE: 'expand' | 'compact' = 'expand';

// ─── Auto-discover: namespace files per language ─────────────────────
// Vite resolves these globs at build time — no hardcoded file list needed.
// Adding a new JSON to locales/en/ or locales/es/ is picked up automatically.
const enModules = import.meta.glob<Record<string, string>>(
  './locales/en/*.json',
  { eager: true, import: 'default' },
);
const esModules = import.meta.glob<Record<string, string>>(
  './locales/es/*.json',
  { eager: true, import: 'default' },
);

// ─── Auto-discover: legacy flat files (translation namespace) ────────
// These provide the default "translation" namespace (SettingsPage, etc.)
// and single-namespace languages (fr, de, it, …).
const legacyModules = import.meta.glob<Record<string, string>>(
  './locales/*.json',
  { eager: true, import: 'default' },
);

// ─── Helpers ─────────────────────────────────────────────────────────
/** Extract namespace (or language code) from a glob path. */
function nsFromPath(path: string): string {
  return path.split('/').pop()!.replace('.json', '');
}

/** Convert a glob result into { namespaceName: jsonContent } map. */
function buildNsMap(
  modules: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  for (const [path, json] of Object.entries(modules)) {
    map[nsFromPath(path)] = json;
  }
  return map;
}

// ─── Namespace Registry ──────────────────────────────────────────────
const enNamespaces = buildNsMap(enModules);
const esNamespaces = buildNsMap(esModules);

/** All discovered namespace names (auto-derived from en/*.json files). */
const NAMESPACES = Object.keys(enNamespaces);

/** Full namespace list including the legacy "translation" namespace. */
const NS = ['translation', ...NAMESPACES];

// ─── TypeScript types ────────────────────────────────────────────────
export type Namespace =
  | 'achievements'
  | 'activity'
  | 'commandDetail'
  | 'commands'
  | 'common'
  | 'discover'
  | 'errors'
  | 'favorites'
  | 'feedback'
  | 'home'
  | 'labs'
  | 'navigation'
  | 'notifications'
  | 'payments'
  | 'profile'
  | 'settings'
  | 'subscription'
  | 'ui';

type LangResources = Record<string, Record<string, string>>;

// ─── Loaders ─────────────────────────────────────────────────────────

/**
 * Expand mode: each namespace file is a separate i18next resource entry.
 * Ready for future lazy-loading by switching to eager: false + dynamic imports.
 */
function loadExpandedTranslations(): Record<string, LangResources> {
  return {
    en: { translation: legacyModules['./locales/en.json'] ?? {}, ...enNamespaces },
    es: { translation: legacyModules['./locales/es.json'] ?? {}, ...esNamespaces },
  };
}

/**
 * Compact mode: all namespaces combined into a single resource object
 * per language for maximum performance — one logical bundle, zero overhead.
 */
function loadCompactTranslations(): Record<string, LangResources> {
  const compact = (
    legacy: Record<string, string>,
    nsMap: Record<string, Record<string, string>>,
  ): LangResources => ({
    translation: legacy,
    ...Object.fromEntries(NAMESPACES.map((ns) => [ns, nsMap[ns]])),
  });

  return {
    en: compact(legacyModules['./locales/en.json'] ?? {}, enNamespaces),
    es: compact(legacyModules['./locales/es.json'] ?? {}, esNamespaces),
  };
}

// ─── Build resources ─────────────────────────────────────────────────
const i18nResources: Record<string, LangResources> =
  I18N_MODE === 'expand'
    ? loadExpandedTranslations()
    : loadCompactTranslations();

// Append legacy-only languages (flat translation namespace only: fr, de, …)
for (const [path, json] of Object.entries(legacyModules)) {
  const lang = nsFromPath(path);
  if (!i18nResources[lang]) {
    i18nResources[lang] = { translation: json };
  }
}

// ─── Persist / restore language ──────────────────────────────────────
const LANG_KEY = 'app_lang';
const savedLang = (() => {
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
})();

// ─── Init i18next ────────────────────────────────────────────────────
i18n.use(initReactI18next).init({
  resources: i18nResources,
  ns: NS,
  defaultNS: 'translation',
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem(LANG_KEY, lng); } catch { /* ignore */ }
});

export default i18n;
