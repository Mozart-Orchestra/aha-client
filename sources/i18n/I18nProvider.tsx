import React, { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation as usei18n, I18nextProvider } from 'react-i18next'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import i18n from './i18n'
import type { SupportedLanguage } from './types'

interface I18nContextType {
  language: SupportedLanguage
  changeLanguage: (language: SupportedLanguage) => Promise<void>
  isReady: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

interface I18nProviderProps {
  children: React.ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en')

  useEffect(() => {
    // Wait for i18n to initialize
    const init = async () => {
      try {
        await i18n.init
        setCurrentLanguage(i18n.language as SupportedLanguage)
        setIsReady(true)
      } catch (error) {
        console.error('Error initializing i18n:', error)
        // Fallback to ready state even if there's an error
        setIsReady(true)
      }
    }

    init()

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng as SupportedLanguage)
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  const changeLanguage = async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language)
      setCurrentLanguage(language)
    } catch (error) {
      console.error('Error changing language:', error)
      throw error
    }
  }

  const contextValue: I18nContextType = {
    language: currentLanguage,
    changeLanguage,
    isReady
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={contextValue}>
        {children}
      </I18nContext.Provider>
    </I18nextProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
})

export default I18nProvider
