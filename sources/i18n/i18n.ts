import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'react-native-localize'
import AsyncStorage from '@react-native-async-storage/async-storage'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

const LANGUAGE_KEY = '@happy_app_language'

// Get device language or fallback to English
const getDeviceLanguage = () => {
  const locales = getLocales()
  if (locales.length > 0) {
    const deviceLanguage = locales[0].languageCode
    // Map device language to supported languages
    if (deviceLanguage === 'zh') {
      // Check for specific Chinese variants
      const region = locales[0].languageTag?.split('-')[1] || ''
      return region === 'TW' || region === 'HK' ? 'zh-TW' : 'zh-CN'
    }
    return deviceLanguage
  }
  return 'en'
}

// Load saved language preference
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY)
    return savedLanguage || getDeviceLanguage()
  } catch (error) {
    console.error('Error loading saved language:', error)
    return getDeviceLanguage()
  }
}

// Save language preference
export const saveLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
  } catch (error) {
    console.error('Error saving language:', error)
  }
}

// Initialize i18n
const initI18n = async () => {
  const savedLanguage = await loadSavedLanguage()

  await i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: en },
        'zh-CN': { translation: zhCN }
      },
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false // React Native already escapes values
      },
      react: {
        useSuspense: false // Disable suspense for React Native
      }
    })

  return savedLanguage
}

// Export i18n instance and language change handler
export { i18n }
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language)
  await saveLanguage(language)
}

// Auto-initialize
initI18n().catch(error => {
  console.error('Error initializing i18n:', error)
})

export default i18n
