import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../core/public/locales/en/ui.json";
import pl from "../../core/public/locales/pl/ui.json";

// Same `ui` namespace the host loads at runtime, bundled statically for the catalogue
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  ns: ["ui"],
  defaultNS: "ui",
  resources: { en: { ui: en }, pl: { ui: pl } },
  interpolation: { escapeValue: false },
});

export default i18n;
