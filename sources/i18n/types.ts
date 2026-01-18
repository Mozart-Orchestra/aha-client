/**
 * i18n Type Definitions
 * Type-safe translation keys and utilities
 */

// Translation namespaces
export type TranslationNamespace =
  | 'common'
  | 'components'
  | 'screens'
  | 'errors'
  | 'tasks'
  | 'team';

// Supported languages
export type SupportedLanguage = 'en' | 'zh';

// Language option for UI
export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

// i18n context type for type-safe translations
export interface I18nContext {
  t: (key: string, options?: any) => string;
  i18n: {
    language: SupportedLanguage;
    changeLanguage: (language: string) => Promise<void>;
  };
}

// Plural forms
export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

// Translation interpolation options
export interface TranslationOptions {
  count?: number;
  [key: string]: any;
}

// Prompt-specific types
export interface PromptTemplate {
  template: string;
  variables?: string[];
  context?: string;
}

export interface LocalizedPrompt {
  [locale: string]: PromptTemplate;
}

// MCP-specific types
export interface MCPToolDescription {
  name: string;
  description: LocalizedPrompt;
  parameters?: any;
}

export interface MCPResourceDescription {
  uri: string;
  description: LocalizedPrompt;
}

// Team role i18n types
export interface LocalizedText {
  [locale: string]: string;
}

export interface LocalizedTextArray {
  [locale: string]: string[];
}

export interface LocalizedTeamRole {
  id: string;
  i18n: {
    title: LocalizedText;
    summary: LocalizedText;
    responsibilities: LocalizedTextArray;
    abilityBoundaries: LocalizedTextArray;
    handoffProtocol: LocalizedTextArray;
    protocol: LocalizedTextArray;
  };
  policy?: any;
}

// Memory library types
export interface I18nRule {
  id: string;
  i18n: {
    content: LocalizedText;
    explanation?: LocalizedText;
  };
  priority: number;
  tags: string[];
}

export interface I18nMemory {
  id: string;
  i18n: {
    content: LocalizedText;
    context?: LocalizedText;
  };
  importance: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityI18nConfig {
  entityId: string;
  entityType: 'user' | 'team' | 'agent' | 'session';
  locale: SupportedLanguage;
  rules: I18nRule[];
  memory: I18nMemory[];
}

// Helper type for translation keys (will be generated)
export type TranslationKey = string;

// Type-safe t function
export type TFunction = (key: TranslationKey, options?: TranslationOptions) => string;
