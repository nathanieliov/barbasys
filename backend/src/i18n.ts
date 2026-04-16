import i18next from 'i18next';

import esDO from './locales/es-DO.json' with { type: 'json' };
import enUS from './locales/en-US.json' with { type: 'json' };

i18next.init({
  lng: 'es-DO',
  fallbackLng: 'es-DO',
  resources: {
    'es-DO': {
      translation: esDO,
    },
    'en-US': {
      translation: enUS,
    },
  },
});

export default i18next;
