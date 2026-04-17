import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en/translation.json";
import pt from "./pt/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: "pt", // idioma inicial
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
