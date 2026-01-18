import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import enCommon from '../locales/en/common.json';
import enComponents from '../locales/en/components.json';
import enScreens from '../locales/en/screens.json';
import enErrors from '../locales/en/errors.json';
import enTasks from '../locales/en/tasks.json';
import enTeam from '../locales/en/team.json';
import enMemory from '../locales/en/memory.json';
import enRules from '../locales/en/rules.json';

import zhCommon from '../locales/zh/common.json';
import zhComponents from '../locales/zh/components.json';
import zhScreens from '../locales/zh/screens.json';
import zhErrors from '../locales/zh/errors.json';
import zhTasks from '../locales/zh/tasks.json';
import zhTeam from '../locales/zh/team.json';
import zhMemory from '../locales/zh/memory.json';
import zhRules from '../locales/zh/rules.json';

// Import prompt translations
import enPromptsRoles from './prompts/en/roles.json';
import enPromptsTasks from './prompts/en/tasks.json';
import enPromptsCollaboration from './prompts/en/collaboration.json';
import enPromptsSystem from './prompts/en/system.json';

import zhPromptsRoles from './prompts/zh/roles.json';
import zhPromptsTasks from './prompts/zh/tasks.json';
import zhPromptsCollaboration from './prompts/zh/collaboration.json';
import zhPromptsSystem from './prompts/zh/system.json';

// Import MCP translations
import enMcpTools from './mcp/en/tools.json';
import enMcpResources from './mcp/en/resources.json';
import enMcpResponses from './mcp/en/responses.json';

import zhMcpTools from './mcp/zh/tools.json';
import zhMcpResources from './mcp/zh/resources.json';
import zhMcpResponses from './mcp/zh/responses.json';

// Language storage key
const LANGUAGE_KEY = '@happy_app_language';

// Get device locale
const getDeviceLocale = (): string => {
  const locales = getLocales();
  if (locales && locales.length > 0) {
    const locale = locales[0].languageCode || 'en';
    // Map device locale to supported locales
    if (locale === 'zh' || locale === 'zh-CN') {
      return 'zh';
    }
    return 'en';
  }
  return 'en';
};

// Load saved language preference
const loadSavedLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
  return getDeviceLocale();
};

// Save language preference
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Resources configuration
const resources = {
  en: {
    common: enCommon,
    components: enComponents,
    screens: enScreens,
    errors: enErrors,
    tasks: enTasks,
    team: enTeam,
    memory: enMemory,
    rules: enRules,
    prompts: {
      roles: enPromptsRoles,
      tasks: enPromptsTasks,
      collaboration: enPromptsCollaboration,
      system: enPromptsSystem,
    },
    mcp: {
      tools: enMcpTools.tools,
      resources: enMcpResources.resources,
      responses: enMcpResponses.responses,
    },
  },
  zh: {
    common: zhCommon,
    components: zhComponents,
    screens: zhScreens,
    errors: zhErrors,
    tasks: zhTasks,
    team: zhTeam,
    memory: zhMemory,
    rules: zhRules,
    prompts: {
      roles: zhPromptsRoles,
      tasks: zhPromptsTasks,
      collaboration: zhPromptsCollaboration,
      system: zhPromptsSystem,
    },
    mcp: {
      tools: zhMcpTools.tools,
      resources: zhMcpResources.resources,
      responses: zhMcpResponses.responses,
    },
  },
};

// i18next configuration
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Will be updated after loading saved preference
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'components', 'screens', 'errors', 'tasks', 'team', 'memory', 'rules', 'prompts', 'mcp'],
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

// Initialize language on app start
export const initializeLanguage = async (): Promise<void> => {
  const savedLanguage = await loadSavedLanguage();
  await i18n.changeLanguage(savedLanguage);
};

// Change language and save preference
export const changeLanguage = async (language: string): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language;
};

// Get supported languages
export const getSupportedLanguages = (): Array<{ code: string; name: string; nativeName: string }> => {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
  ];
};

// Check if a language is supported
export const isLanguageSupported = (language: string): boolean => {
  return resources.hasOwnProperty(language);
};

export default i18n;
