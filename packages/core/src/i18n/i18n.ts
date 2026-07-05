import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const MFE_URLS: Record<string, string> = {
  settings: import.meta.env.VITE_MFE_SETTINGS_URL || 'http://127.0.0.1:4201',
  community: import.meta.env.VITE_MFE_COMMUNITY_URL || 'http://127.0.0.1:4202',
  shopping: import.meta.env.VITE_MFE_SHOPPING_URL || 'http://127.0.0.1:4203',
  scheduling: import.meta.env.VITE_MFE_SCHEDULING_URL || 'http://127.0.0.1:4204',
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    // Only eagerly load core namespaces served by the host.
    // MFE namespaces (settings, community, shopping, scheduling) are loaded
    // lazily on-demand when useTranslation('settings') etc. is called.
    ns: ['common', 'auth'],
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    backend: {
      loadPath: (lngs: string[], namespaces: string[]) => {
        const lng = lngs[0];
        const ns = namespaces[0];
        const mfeUrl = MFE_URLS[ns];
        if (mfeUrl) {
          return `${mfeUrl}/locales/${lng}/${ns}.json`;
        }
        return `/locales/${lng}/${ns}.json`;
      },
      requestOptions: {
        cache: 'no-store',
      },
    },
  });

export default i18n;
export { i18n };
