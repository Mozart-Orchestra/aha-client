/**
 * Team Roles i18n Helper
 * Provides localized team roles from @/text system
 */

import { translations, getCurrentLanguage, type SupportedLanguage, type TranslationStructure } from '@/text'
import type { TEAM_ROLE_LIBRARY } from './index'

export interface LocalizedTeamRole {
  id: string
  title: string
  summary: string
  responsibilities: string[]
  abilityBoundaries: string[]
  handoffProtocol: string[]
  protocol: string[]
  policy?: any
}

/**
 * Get localized team roles for all roles
 * Automatically uses current language from @/text system
 */
export function getLocalizedTeamRoles(): LocalizedTeamRole[] {
  const roleKeys = ['master', 'framer', 'builder', 'scout', 'scribe', 'qa', 'reviewer'] as const
  const currentLang = getCurrentLanguage()
  const currentTranslations = translations[currentLang] as TranslationStructure

  return roleKeys.map(roleKey => {
    const translation = (currentTranslations as any).teamRoles?.[roleKey]

    if (!translation) {
      throw new Error(`Missing translation for role: ${roleKey}`)
    }

    return {
      id: roleKey,
      title: translation.title,
      summary: translation.summary,
      responsibilities: translation.responsibilities as string[],
      abilityBoundaries: translation.abilityBoundaries as string[],
      handoffProtocol: translation.handoffProtocol as string[],
      protocol: translation.protocol as string[],
    }
  })
}

/**
 * Get localized team role by ID
 */
export function getLocalizedTeamRole(roleId: string): LocalizedTeamRole | undefined {
  const roles = getLocalizedTeamRoles()
  return roles.find(role => role.id === roleId)
}

/**
 * Get localized team role title
 * Convenience function for simple display
 */
export function getTeamRoleTitle(roleId: string): string {
  const role = getLocalizedTeamRole(roleId)
  return role?.title || roleId
}

/**
 * Get localized team role summary
 * Convenience function for descriptions
 */
export function getTeamRoleSummary(roleId: string): string {
  const role = getLocalizedTeamRole(roleId)
  return role?.summary || ''
}

/**
 * Get all team role titles as a mapping
 * Useful for dropdowns and selectors
 */
export function getTeamRoleTitles(): Record<string, string> {
  const roles = getLocalizedTeamRoles()
  return roles.reduce((acc, role) => {
    acc[role.id] = role.title
    return acc
  }, {} as Record<string, string>)
}

/**
 * Export as array for backward compatibility with DEFAULT_TEAM_ROLES
 * This allows easy migration from hardcoded roles to localized roles
 */
export function getLocalizedTeamRolesAsArray() {
  return getLocalizedTeamRoles()
}

export default getLocalizedTeamRoles
