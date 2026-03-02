/**
 * Entity Memory Library
 * Per-entity rules and memory with i18n support
 * Each entity (user, team, agent, session) can have its own localized knowledge base
 */

import i18n from '../config';
import type { EntityI18nConfig, I18nRule, I18nMemory, SupportedLanguage, LocalizedText } from '../types';

/**
 * Entity Memory Library Class
 */
export class EntityMemoryLibrary {
  private storage: Map<string, EntityI18nConfig> = new Map();

  /**
   * Get entity configuration
   */
  async getEntityConfig(entityId: string, entityType: string): Promise<EntityI18nConfig | null> {
    const key = `${entityType}:${entityId}`;
    return this.storage.get(key) || null;
  }

  /**
   * Create or update entity configuration
   */
  async setEntityConfig(config: EntityI18nConfig): Promise<void> {
    const key = `${config.entityType}:${config.entityId}`;
    this.storage.set(key, config);
  }

  /**
   * Get localized rule for an entity
   */
  async getRule(entityId: string, ruleId: string, locale: SupportedLanguage): Promise<I18nRule | null> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return null;
    }

    const rule = entityConfig.rules.find(r => r.id === ruleId);
    if (!rule) {
      return null;
    }

    return rule;
  }

  /**
   * Get rule content in specific locale
   */
  async getRuleContent(entityId: string, ruleId: string, locale: SupportedLanguage): Promise<string | null> {
    const rule = await this.getRule(entityId, ruleId, locale);
    if (!rule) {
      return null;
    }

    return rule.i18n.content[locale] || rule.i18n.content['en'] || null;
  }

  /**
   * Add new rule with multi-language support
   */
  async addRule(
    entityId: string,
    entityType: string,
    rule: Omit<I18nRule, 'id'>
  ): Promise<string> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId && c.entityType === entityType);

    const newRule: I18nRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...rule,
    };

    if (entityConfig) {
      entityConfig.rules.push(newRule);
      const key = `${entityType}:${entityId}`;
      this.storage.set(key, entityConfig);
    } else {
      const newConfig: EntityI18nConfig = {
        entityId,
        entityType: entityType as any,
        locale: 'en',
        rules: [newRule],
        memory: [],
      };
      const key = `${entityType}:${entityId}`;
      this.storage.set(key, newConfig);
    }

    return newRule.id;
  }

  /**
   * Search memory across all languages, return in preferred locale
   */
  async searchMemory(
    entityId: string,
    query: string,
    locale: SupportedLanguage
  ): Promise<I18nMemory[]> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return [];
    }

    const queryLower = query.toLowerCase();

    return entityConfig.memory.filter(mem => {
      // Search across all locales
      for (const lang of Object.keys(mem.i18n.content)) {
        const content = mem.i18n.content[lang];
        if (content.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
      if (mem.i18n.context) {
        for (const lang of Object.keys(mem.i18n.context)) {
          const context = mem.i18n.context[lang];
          if (context && context.toLowerCase().includes(queryLower)) {
            return true;
          }
        }
      }
      // Also search in tags
      return mem.tags.some(tag => tag.toLowerCase().includes(queryLower));
    });
  }

  /**
   * Get memory content in specific locale
   */
  async getMemoryContent(
    entityId: string,
    memoryId: string,
    locale: SupportedLanguage
  ): Promise<string | null> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return null;
    }

    const memory = entityConfig.memory.find(m => m.id === memoryId);
    if (!memory) {
      return null;
    }

    // Return content in preferred locale, fallback to English
    return memory.i18n.content[locale] || memory.i18n.content['en'] || null;
  }

  /**
   * Add memory with multi-language support
   */
  async addMemory(
    entityId: string,
    entityType: string,
    memory: Omit<I18nMemory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId && c.entityType === entityType);

    const now = new Date();
    const newMemory: I18nMemory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...memory,
      createdAt: now,
      updatedAt: now,
    };

    if (entityConfig) {
      entityConfig.memory.push(newMemory);
      const key = `${entityType}:${entityId}`;
      this.storage.set(key, entityConfig);
    } else {
      const newConfig: EntityI18nConfig = {
        entityId,
        entityType: entityType as any,
        locale: 'en',
        rules: [],
        memory: [newMemory],
      };
      const key = `${entityType}:${entityId}`;
      this.storage.set(key, newConfig);
    }

    return newMemory.id;
  }

  /**
   * Get all rules and memories for an entity in specific locale
   */
  async getAllForEntity(
    entityId: string,
    locale: SupportedLanguage
  ): Promise<{
    rules: Array<{ id: string; content: string; explanation?: string; priority: number; tags: string[] }>;
    memory: Array<{ id: string; content: string; context?: string; importance: number; tags: string[] }>;
  }> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return { rules: [], memory: [] };
    }

    const rules = entityConfig.rules.map(rule => ({
      id: rule.id,
      content: rule.i18n.content[locale] || rule.i18n.content['en'] || '',
      explanation: rule.i18n.explanation
        ? rule.i18n.explanation[locale] || rule.i18n.explanation['en']
        : undefined,
      priority: rule.priority,
      tags: rule.tags,
    }));

    const memory = entityConfig.memory.map(mem => ({
      id: mem.id,
      content: mem.i18n.content[locale] || mem.i18n.content['en'] || '',
      context: mem.i18n.context
        ? mem.i18n.context[locale] || mem.i18n.context['en']
        : undefined,
      importance: mem.importance,
      tags: mem.tags,
    }));

    return { rules, memory };
  }

  /**
   * Update entity's preferred locale
   */
  async updateEntityLocale(entityId: string, entityType: string, locale: SupportedLanguage): Promise<void> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId && c.entityType === entityType);

    if (entityConfig) {
      entityConfig.locale = locale;
      const key = `${entityType}:${entityId}`;
      this.storage.set(key, entityConfig);
    }
  }

  /**
   * Delete rule
   */
  async deleteRule(entityId: string, ruleId: string): Promise<boolean> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return false;
    }

    const index = entityConfig.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return false;
    }

    entityConfig.rules.splice(index, 1);
    const key = `${entityConfig.entityType}:${entityId}`;
    this.storage.set(key, entityConfig);
    return true;
  }

  /**
   * Delete memory
   */
  async deleteMemory(entityId: string, memoryId: string): Promise<boolean> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return false;
    }

    const index = entityConfig.memory.findIndex(m => m.id === memoryId);
    if (index === -1) {
      return false;
    }

    entityConfig.memory.splice(index, 1);
    const key = `${entityConfig.entityType}:${entityId}`;
    this.storage.set(key, entityConfig);
    return true;
  }

  /**
   * Get statistics for an entity
   */
  async getStats(entityId: string): Promise<{
    ruleCount: number;
    memoryCount: number;
    locale: string;
  } | null> {
    const configs = Array.from(this.storage.values());
    const entityConfig = configs.find(c => c.entityId === entityId);

    if (!entityConfig) {
      return null;
    }

    return {
      ruleCount: entityConfig.rules.length,
      memoryCount: entityConfig.memory.length,
      locale: entityConfig.locale,
    };
  }
}

// Singleton instance
let entityMemoryLibraryInstance: EntityMemoryLibrary | null = null;

/**
 * Get or create the entity memory library singleton
 */
export const getEntityMemoryLibrary = (): EntityMemoryLibrary => {
  if (!entityMemoryLibraryInstance) {
    entityMemoryLibraryInstance = new EntityMemoryLibrary();
  }
  return entityMemoryLibraryInstance;
};

export default EntityMemoryLibrary;
