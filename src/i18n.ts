import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { DropdownOption } from "./utils/types";

export enum LanguageType {
  EN = "en",
  PL = "pl",
}

export const lngLabelMap: Record<LanguageType, string> = {
  [LanguageType.PL]: "Polski",
  [LanguageType.EN]: "English",
};

export const availableLanguages: DropdownOption<LanguageType>[] = [
  { label: lngLabelMap[LanguageType.PL], value: LanguageType.PL },
  { label: lngLabelMap[LanguageType.EN], value: LanguageType.EN },
];

i18n
  // i18next-http-backend, loads translations from your server
  .use(Backend)
  // detect user language, learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next, for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: false,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    // ns: ["common"],
    // fallbackNS: "common",
    // defaultNS: "common",
  });

export default i18n;
