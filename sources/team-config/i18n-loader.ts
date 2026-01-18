/**
 * i18n-enabled Team Configuration Loader
 * 支持国际化的团队配置加载器
 */

import { getTeamRoles, getAvailableRoleLocales } from '../locales/prompts/index';
import { READ_ONLY_TOOLS, DEFAULT_TEAM_AGREEMENTS, DEFAULT_STATUS_PROPAGATION, DEFAULT_NESTED_TASK_SETTINGS } from './index';

/**
 * Get localized team role library
 * 获取本地化的团队角色库
 */
export function getLocalizedTeamRoleLibrary(locale: string = 'zh') {
  const config = getTeamRoles(locale);

  // Convert localized config to the expected format
  const roles = Object.values(config.roles).map((role: any) => ({
    id: role.id,
    title: role.title,
    summary: role.summary,
    responsibilities: role.responsibilities,
    abilityBoundaries: role.abilityBoundaries,
    handoffProtocol: role.handoffProtocol,
    protocol: role.protocol,
    // Keep the original policy structure
    policy: {
      autoStartMaster: role.id === 'master',
      permissionMode: role.id === 'master' ? 'plan' : 'yolo',
      watchers: role.id === 'master' ? ['kanban', 'diagnostics'] : undefined,
      accessLevel: ['master', 'framer', 'builder'].includes(role.id) ? 'read-only' : 'read-only',
      disallowedTools: ['master', 'framer', 'builder'].includes(role.id) ? undefined : READ_ONLY_TOOLS,
      taskSettings: role.id === 'master' ? { ...DEFAULT_NESTED_TASK_SETTINGS } : undefined
    }
  }));

  return roles;
}

/**
 * Get localized team agreements
 * 获取本地化的团队协议
 */
export function getLocalizedTeamAgreements(locale: string = 'zh') {
  const config = getTeamRoles(locale);
  return config.agreements;
}

/**
 * Get complete localized team configuration
 * 获取完整的本地化团队配置
 */
export function getLocalizedTeamConfig(locale: string = 'zh') {
  return {
    roles: getLocalizedTeamRoleLibrary(locale),
    agreements: getLocalizedTeamAgreements(locale),
    availableLocales: getAvailableRoleLocales()
  };
}
