import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  detectDeviceLanguage,
  getStoredLanguagePreference,
  resolveLanguage,
  setStoredLanguagePreference,
  supportedLanguages,
  type LanguagePreference,
} from './languagePreference';

import enA11y from './locales/en/a11y.json';
import enActor from './locales/en/actor.json';
import enAuth from './locales/en/auth.json';
import enBrowse from './locales/en/browse.json';
import enCalendar from './locales/en/calendar.json';
import enCommon from './locales/en/common.json';
import enComponents from './locales/en/components.json';
import enDetails from './locales/en/details.json';
import enEditProfile from './locales/en/editProfile.json';
import enGenres from './locales/en/genres.json';
import enHome from './locales/en/home.json';
import enImport from './locales/en/import.json';
import enLegal from './locales/en/legal.json';
import enListDetail from './locales/en/listDetail.json';
import enLists from './locales/en/lists.json';
import enMyList from './locales/en/myList.json';
import enNotifications from './locales/en/notifications.json';
import enProfile from './locales/en/profile.json';
import enSearch from './locales/en/search.json';
import enStats from './locales/en/stats.json';
import enToasts from './locales/en/toasts.json';
import trA11y from './locales/tr/a11y.json';
import trActor from './locales/tr/actor.json';
import trAuth from './locales/tr/auth.json';
import trBrowse from './locales/tr/browse.json';
import trCalendar from './locales/tr/calendar.json';
import trCommon from './locales/tr/common.json';
import trComponents from './locales/tr/components.json';
import trDetails from './locales/tr/details.json';
import trEditProfile from './locales/tr/editProfile.json';
import trGenres from './locales/tr/genres.json';
import trHome from './locales/tr/home.json';
import trImport from './locales/tr/import.json';
import trLegal from './locales/tr/legal.json';
import trListDetail from './locales/tr/listDetail.json';
import trLists from './locales/tr/lists.json';
import trMyList from './locales/tr/myList.json';
import trNotifications from './locales/tr/notifications.json';
import trProfile from './locales/tr/profile.json';
import trSearch from './locales/tr/search.json';
import trStats from './locales/tr/stats.json';
import trToasts from './locales/tr/toasts.json';

export { supportedLanguages };
export type { LanguagePreference };

const resources = {
  en: {
    translation: {
      ...enCommon,
      ...enAuth,
      ...enHome,
      ...enMyList,
      ...enSearch,
      ...enLists,
      ...enProfile,
      ...enCalendar,
      ...enStats,
      ...enLegal,
      ...enDetails,
      ...enActor,
      ...enImport,
      ...enEditProfile,
      ...enBrowse,
      ...enListDetail,
      ...enComponents,
      ...enNotifications,
      ...enToasts,
      ...enGenres,
      ...enA11y,
    },
  },
  tr: {
    translation: {
      ...trCommon,
      ...trAuth,
      ...trHome,
      ...trMyList,
      ...trSearch,
      ...trLists,
      ...trProfile,
      ...trCalendar,
      ...trStats,
      ...trLegal,
      ...trDetails,
      ...trActor,
      ...trImport,
      ...trEditProfile,
      ...trBrowse,
      ...trListDetail,
      ...trComponents,
      ...trNotifications,
      ...trToasts,
      ...trGenres,
      ...trA11y,
    },
  },
};

// Init synchronously with the device language so the first render is already
// localized; the stored preference (which may override it) is applied right
// after via applyStoredLanguagePreference, since reading it is async.
i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Reads the saved language preference and switches to it if it differs from
// the current language. Call once on startup (see app/_layout.tsx).
export async function applyStoredLanguagePreference(): Promise<void> {
  const preference = await getStoredLanguagePreference();
  const language = resolveLanguage(preference);
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
}

// Persists the chosen preference and applies it immediately.
export async function changeLanguagePreference(preference: LanguagePreference): Promise<void> {
  await setStoredLanguagePreference(preference);
  await i18n.changeLanguage(resolveLanguage(preference));
}

export default i18n;
