import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const getDevHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return '127.0.0.1';
};

const devHost = getDevHost();

const MFE_URLS: Record<string, string> = {
  settings: import.meta.env.VITE_MFE_SETTINGS_URL || `http://${devHost}:4201`,
  community: import.meta.env.VITE_MFE_COMMUNITY_URL || `http://${devHost}:4202`,
  shopping: import.meta.env.VITE_MFE_SHOPPING_URL || `http://${devHost}:4203`,
  planning: import.meta.env.VITE_MFE_PLANNING_URL || `http://${devHost}:4204`,
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    // Only eagerly load core namespaces served by the host.
    // MFE namespaces (settings, community, shopping, planning) are loaded
    // lazily on-demand when useTranslation('settings') etc. is called.
    ns: ['common', 'auth', 'ui'],
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
