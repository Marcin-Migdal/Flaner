import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { getMfeUrl } from '../mfeRegistry';

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
        const mfeUrl = getMfeUrl(ns);
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
