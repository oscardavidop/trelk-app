import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Legacy flat files (settings page keys)
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import tr from './locales/tr.json';
import nl from './locales/nl.json';

// Namespaced translations (en)
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enHome from './locales/en/home.json';
import enCommands from './locales/en/commands.json';
import enCommandDetail from './locales/en/commandDetail.json';
import enFavorites from './locales/en/favorites.json';
import enDiscover from './locales/en/discover.json';
import enActivity from './locales/en/activity.json';
import enAchievements from './locales/en/achievements.json';
import enProfile from './locales/en/profile.json';
import enSettings from './locales/en/settings.json';
import enLabs from './locales/en/labs.json';
import enErrors from './locales/en/errors.json';
import enPayments from './locales/en/payments.json';
import enSubscription from './locales/en/subscription.json';
import enUi from './locales/en/ui.json';

// Namespaced translations (es)
import esCommon from './locales/es/common.json';
import esNavigation from './locales/es/navigation.json';
import esHome from './locales/es/home.json';
import esCommands from './locales/es/commands.json';
import esCommandDetail from './locales/es/commandDetail.json';
import esFavorites from './locales/es/favorites.json';
import esDiscover from './locales/es/discover.json';
import esActivity from './locales/es/activity.json';
import esAchievements from './locales/es/achievements.json';
import esProfile from './locales/es/profile.json';
import esSettings from './locales/es/settings.json';
import esLabs from './locales/es/labs.json';
import esErrors from './locales/es/errors.json';
import esPayments from './locales/es/payments.json';
import esSubscription from './locales/es/subscription.json';
import esUi from './locales/es/ui.json';

const NS = ['translation', 'common', 'navigation', 'home', 'commands', 'commandDetail', 'favorites', 'discover', 'activity', 'achievements', 'profile', 'settings', 'labs', 'errors', 'payments', 'subscription', 'ui'] as const;

const resources = {
  en: {
    translation: en,
    common: enCommon,
    navigation: enNavigation,
    home: enHome,
    commands: enCommands,
    commandDetail: enCommandDetail,
    favorites: enFavorites,
    discover: enDiscover,
    activity: enActivity,
    achievements: enAchievements,
    profile: enProfile,
    settings: enSettings,
    labs: enLabs,
    errors: enErrors,
    payments: enPayments,
    subscription: enSubscription,
    ui: enUi,
  },
  es: {
    translation: es,
    common: esCommon,
    navigation: esNavigation,
    home: esHome,
    commands: esCommands,
    commandDetail: esCommandDetail,
    favorites: esFavorites,
    discover: esDiscover,
    activity: esActivity,
    achievements: esAchievements,
    profile: esProfile,
    settings: esSettings,
    labs: esLabs,
    errors: esErrors,
    payments: esPayments,
    subscription: esSubscription,
    ui: esUi,
  },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  ru: { translation: ru },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
  tr: { translation: tr },
  nl: { translation: nl },
};

i18n.use(initReactI18next).init({
  resources,
  ns: NS as unknown as string[],
  defaultNS: 'translation',
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
