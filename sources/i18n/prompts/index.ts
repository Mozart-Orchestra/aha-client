/**
 * Prompt Manager
 * Manages localized prompt templates for AI interactions
 */

import i18n from '../config';
import { PromptTemplate, LocalizedPrompt } from '../types';

export class PromptManager {
  /**
   * Get a prompt template by key with locale support
   */
  getPrompt(key: string, locale?: string): string {
    const lng = locale || i18n.language;
    const template = i18n.t(`prompts.${key}`, { lng });
    return template;
  }

  /**
   * Get a prompt template with variable interpolation
   */
  getPromptWithVariables(
    key: string,
    variables: Record<string, any>,
    locale?: string
  ): string {
    const lng = locale || i18n.language;
    const template = i18n.t(`prompts.${key}`, { lng, ...variables });
    return template;
  }

  /**
   * Get role-specific prompt
   */
  getRolePrompt(roleId: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`prompts.roles.${roleId}`, { lng });
  }

  /**
   * Get system instruction
   */
  getSystemInstruction(instructionKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`prompts.system.${instructionKey}`, { lng });
  }

  /**
   * Get task-related prompt
   */
  getTaskPrompt(taskKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`prompts.tasks.${taskKey}`, { lng });
  }

  /**
   * Get collaboration prompt
   */
  getCollaborationPrompt(collabKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`prompts.collaboration.${collabKey}`, { lng });
  }

  /**
   * Check if a prompt key exists
   */
  hasPrompt(key: string, locale?: string): boolean {
    const lng = locale || i18n.language;
    return i18n.exists(`prompts.${key}`, { lng });
  }

  /**
   * Get all available prompt keys for a locale
   */
  getAvailablePrompts(locale?: string): string[] {
    const lng = locale || i18n.language;
    const resources = i18n.store.data[lng]?.prompts || {};
    return Object.keys(resources);
  }
}

// Singleton instance
export const promptManager = new PromptManager();

// Export convenience functions
export const getPrompt = (key: string, locale?: string) =>
  promptManager.getPrompt(key, locale);

export const getPromptWithVariables = (
  key: string,
  variables: Record<string, any>,
  locale?: string
) => promptManager.getPromptWithVariables(key, variables, locale);

export const getRolePrompt = (roleId: string, locale?: string) =>
  promptManager.getRolePrompt(roleId, locale);

export const getSystemInstruction = (instructionKey: string, locale?: string) =>
  promptManager.getSystemInstruction(instructionKey, locale);

export const getTaskPrompt = (taskKey: string, locale?: string) =>
  promptManager.getTaskPrompt(taskKey, locale);

export const getCollaborationPrompt = (collabKey: string, locale?: string) =>
  promptManager.getCollaborationPrompt(collabKey, locale);

export default promptManager;
