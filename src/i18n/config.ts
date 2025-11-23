import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';

i18n
  .use(LanguageDetector) // Détecte la langue du navigateur
  .use(initReactI18next) // Passe i18n à react-i18next
  .init({
    resources: {
      fr: {
        translation: frTranslations,
      },
      en: {
        translation: enTranslations,
      },
    },
    fallbackLng: 'fr', // Langue par défaut
    lng: localStorage.getItem('i18nextLng') || 'fr', // Langue actuelle
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;


