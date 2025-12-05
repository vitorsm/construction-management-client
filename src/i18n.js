import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './translations/en.json';
import ptBRTranslations from './translations/pt-BR.json';

// Function to get browser language
const getBrowserLanguage = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !navigator) {
    return 'en';
  }

  // Get browser language (e.g., 'pt-BR', 'pt', 'en-US', 'en')
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  
  // Map browser language to our supported languages
  // Check for Portuguese (pt-BR, pt, pt-PT, etc.)
  if (browserLang.toLowerCase().startsWith('pt')) {
    return 'pt-BR';
  }
  
  // Default to English for all other languages
  return 'en';
};

// Get saved language preference, or browser language, or default to 'en'
const savedLanguage = localStorage.getItem('preferredLanguage');
let defaultLanguage = 'en';

if (savedLanguage && (savedLanguage === 'pt-BR' || savedLanguage === 'en')) {
  // Use saved preference if valid
  defaultLanguage = savedLanguage;
} else {
  // Use browser language if no saved preference
  defaultLanguage = getBrowserLanguage();
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      'pt-BR': {
        translation: ptBRTranslations
      }
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
      prefix: '{',
      suffix: '}'
    }
  });

export default i18n;

