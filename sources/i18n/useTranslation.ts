import { useTranslation as usei18n } from 'react-i18next'
import { changeLanguage } from './i18n'
import type { SupportedLanguage, TFunction } from './types'

/**
 * Custom useTranslation hook with type safety and additional utilities
 */
export const useTranslation = () => {
  const { t, i18n } = usei18n()

  return {
    t: t as TFunction,
    i18n: {
      language: i18n.language as SupportedLanguage,
      changeLanguage: changeLanguage
    }
  }
}

export default useTranslation
