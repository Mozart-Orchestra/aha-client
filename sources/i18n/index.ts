/**
 * i18n Main Export
 * Central export point for i18n functionality
 */

export { default } from './config';
export {
  initializeI18n,
  initializeLanguage,
  changeLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  isLanguageSupported,
  saveLanguage,
} from './config';

export type {
  TranslationNamespace,
  SupportedLanguage,
  LanguageOption,
  I18nContext,
  PluralForm,
  TranslationOptions,
  PromptTemplate,
  LocalizedPrompt,
  MCPToolDescription,
  MCPResourceDescription,
  LocalizedText,
  LocalizedTextArray,
  LocalizedTeamRole,
  I18nRule,
  I18nMemory,
  EntityI18nConfig,
  TranslationKey,
  TFunction,
} from './types';

// Re-export useTranslation from react-i18next for convenience
export { useTranslation } from 'react-i18next';
