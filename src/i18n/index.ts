import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { LANGUAGES } from '@/types/domain'
import fr from './locales/fr.json'
import mg from './locales/mg.json'
import en from './locales/en.json'

export const LANGUAGE_STORAGE_KEY = 'maso.lang'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, mg: { translation: mg }, en: { translation: en } },
    supportedLngs: [...LANGUAGES],
    fallbackLng: 'fr',
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.resolvedLanguage ?? 'fr'

export default i18n
