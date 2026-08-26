import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from '@/i18n/locales/en';
import { fr } from '@/i18n/locales/fr';

/**
 * French is the default language regardless of device locale (per spec); English is fully wired
 * and reachable from Settings, so adding more locales later only means adding another resource.
 */
void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
