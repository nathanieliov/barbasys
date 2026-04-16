import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esDO from './locales/es-DO.json';
import enUS from './locales/en-US.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-DO': {
        translation: esDO,
      },
      'en-US': {
        translation: enUS,
      },
    },
    fallbackLng: 'es-DO',
    lng: 'es-DO', // Default to Spanish (Dominican Republic)
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
