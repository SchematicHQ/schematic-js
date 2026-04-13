import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";

// eslint-disable-next-line import-x/no-named-as-default-member
i18n.use(initReactI18next).init({
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
