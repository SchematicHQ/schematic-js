import i18n, { use as registerPlugin } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";

registerPlugin(initReactI18next).init({
  resources: {
    en,
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
