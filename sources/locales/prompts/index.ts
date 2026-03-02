/**
 * 动态加载团队角色配置
 * Dynamic Team Role Configuration Loader
 */

import { useTranslation } from '../../i18n/useTranslation';

export interface TeamRole {
  id: string;
  title: string;
  summary: string;
  responsibilities: string[];
  abilityBoundaries: string[];
  handoffProtocol: string[];
  protocol: string[];
  policy?: any;
}

export interface TeamAgreements {
  statusUpdates: string;
  handoffs: string;
  escalation: string;
  definitionOfDone: string;
}

export interface LocalizedTeamConfig {
  roles: Record<string, TeamRole>;
  agreements: TeamAgreements;
}

/**
 * Hook to get localized team roles
 * 获取本地化的团队角色
 */
export function useTeamRoles(): LocalizedTeamConfig {
  const { t } = useTranslation();

  // Load roles from the translation system
  // Note: This assumes the roles are loaded via the i18n system
  // The actual JSON files are at: locales/{locale}/prompts/roles.json
  const roles = t('prompts.roles', { returnObjects: true }) as any;
  const agreements = t('prompts.agreements', { returnObjects: true }) as any;

  return {
    roles: roles.roles || {},
    agreements: roles.agreements || agreements
  };
}

/**
 * Get team roles by locale (server-side)
 * 根据语言环境获取团队角色（服务端）
 */
export function getTeamRoles(locale: string = 'zh'): LocalizedTeamConfig {
  const allowedLocales = ['en', 'zh'];
  const safeLocale = allowedLocales.includes(locale) ? locale : 'zh';

  try {
    // Dynamic import based on locale
    const rolesData = require(`./${safeLocale}/roles.json`);
    return {
      roles: rolesData.roles,
      agreements: rolesData.agreements
    };
  } catch (error) {
    console.error(`Failed to load team roles for locale "${safeLocale}":`, error);
    // Fallback to Chinese
    try {
      const zhRoles = require('./zh/roles.json');
      return {
        roles: zhRoles.roles,
        agreements: zhRoles.agreements
      };
    } catch (fallbackError) {
      console.error('Failed to load fallback zh roles:', fallbackError);
      return {
        roles: {},
        agreements: {
          statusUpdates: '',
          handoffs: '',
          escalation: '',
          definitionOfDone: ''
        }
      };
    }
  }
}

/**
 * Get all available locales for team roles
 * 获取所有可用的团队角色语言环境
 */
export function getAvailableRoleLocales(): string[] {
  return ['en', 'zh']; // Add more locales as they are created
}
