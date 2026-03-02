/**
 * MCP i18n Manager
 * Manages localized MCP tool and resource descriptions
 */

import i18n from '../config';
import { MCPToolDescription, MCPResourceDescription } from '../types';

export class MCPI18nManager {
  /**
   * Get localized tool description
   */
  getToolDescription(toolId: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`mcp.tools.${toolId}.description`, { lng });
  }

  /**
   * Get complete tool metadata with i18n
   */
  getToolMetadata(toolId: string, locale?: string): MCPToolDescription {
    const lng = locale || i18n.language;
    const name = i18n.t(`mcp.tools.${toolId}.name`, { lng });
    const description = i18n.t(`mcp.tools.${toolId}.description`, { lng });

    return {
      name,
      description: {
        [lng]: { template: description }
      },
      parameters: this.getToolParameters(toolId, lng)
    };
  }

  /**
   * Get tool parameter descriptions
   */
  getToolParameters(toolId: string, locale: string): Record<string, any> | undefined {
    const paramsKey = `mcp.tools.${toolId}.parameters`;
    if (i18n.exists(paramsKey, { lng: locale })) {
      return i18n.t(paramsKey, { lng: locale, returnObjects: true });
    }
    return undefined;
  }

  /**
   * Get localized resource description
   */
  getResourceDescription(resourceId: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`mcp.resources.${resourceId}.description`, { lng });
  }

  /**
   * Get complete resource metadata with i18n
   */
  getResourceMetadata(resourceId: string, locale?: string): MCPResourceDescription {
    const lng = locale || i18n.language;
    const uri = i18n.t(`mcp.resources.${resourceId}.uri`, { lng });
    const description = i18n.t(`mcp.resources.${resourceId}.description`, { lng });

    return {
      uri,
      description: {
        [lng]: { template: description }
      }
    };
  }

  /**
   * Get localized response template
   */
  getResponseTemplate(responseKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`mcp.responses.${responseKey}`, { lng });
  }

  /**
   * Get localized error message for MCP
   */
  getErrorMessage(errorKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`mcp.errors.${errorKey}`, { lng });
  }

  /**
   * Get localized success message for MCP
   */
  getSuccessMessage(successKey: string, locale?: string): string {
    const lng = locale || i18n.language;
    return i18n.t(`mcp.success.${successKey}`, { lng });
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolId: string, locale?: string): boolean {
    const lng = locale || i18n.language;
    return i18n.exists(`mcp.tools.${toolId}`, { lng });
  }

  /**
   * Get all available tools for a locale
   */
  getAvailableTools(locale?: string): string[] {
    const lng = locale || i18n.language;
    const resources = (i18n.store.data[lng] as any)?.mcp?.tools || {};
    return Object.keys(resources);
  }

  /**
   * Get all available resources for a locale
   */
  getAvailableResources(locale?: string): string[] {
    const lng = locale || i18n.language;
    const resources = (i18n.store.data[lng] as any)?.mcp?.resources || {};
    return Object.keys(resources);
  }
}

// Singleton instance
export const mcpI18nManager = new MCPI18nManager();

// Export convenience functions
export const getToolDescription = (toolId: string, locale?: string) =>
  mcpI18nManager.getToolDescription(toolId, locale);

export const getToolMetadata = (toolId: string, locale?: string) =>
  mcpI18nManager.getToolMetadata(toolId, locale);

export const getResourceDescription = (resourceId: string, locale?: string) =>
  mcpI18nManager.getResourceDescription(resourceId, locale);

export const getResourceMetadata = (resourceId: string, locale?: string) =>
  mcpI18nManager.getResourceMetadata(resourceId, locale);

export const getResponseTemplate = (responseKey: string, locale?: string) =>
  mcpI18nManager.getResponseTemplate(responseKey, locale);

export const getErrorMessage = (errorKey: string, locale?: string) =>
  mcpI18nManager.getErrorMessage(errorKey, locale);

export const getSuccessMessage = (successKey: string, locale?: string) =>
  mcpI18nManager.getSuccessMessage(successKey, locale);

export default mcpI18nManager;
