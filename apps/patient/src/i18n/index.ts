import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";

/**
 * Patient portal i18n setup.
 *
 * - Detects language from localStorage → navigator → fallback to English.
 * - User-selected language persists in localStorage under
 *   ``careflow_patient_lang`` so subsequent visits remember the choice.
 * - English is authoritative; other locales fall back to English keys
 *   when a translation is missing.
 *
 * To add a new language: drop a JSON file under ``locales/`` matching
 * the shape of ``en.json``, then add the import + resource entry here.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      "zh-CN": { translation: zhCN },
      "zh-TW": { translation: zhTW },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "careflow_patient_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
