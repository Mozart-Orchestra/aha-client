/**
 * Team Roles i18n Helper
 * Provides localized team roles from @/text system with 5-role optimized architecture
 */

import { getTranslationSection } from '@/text'
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

export interface RoleModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingBudget?: number;
}

export interface RoleToolPermissions {
  read: boolean;
  write: boolean;
  edit: boolean;
  bash: boolean;
  runTests: boolean;
  documentation: boolean;
  teamChat: boolean;
}

export interface RoleMetadata {
  id: string;
  modelConfig: RoleModelConfig;
  toolPermissions: RoleToolPermissions;
}

/**
 * Available AI models for session/role selection.
 * Each entry represents a model that can be assigned to a role or session.
 */
export interface AvailableModel {
  id: string;
  label: string;
  provider: 'anthropic' | 'openai' | 'google' | 'deepseek' | 'custom';
  tier: 'opus' | 'sonnet' | 'haiku' | 'premium' | 'standard' | 'economy';
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  // Anthropic
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', tier: 'opus' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', tier: 'sonnet' },
  { id: 'claude-haiku-4', label: 'Claude Haiku 4', provider: 'anthropic', tier: 'haiku' },
  // OpenAI
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', tier: 'premium' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', tier: 'economy' },
  // Google
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'google', tier: 'premium' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'google', tier: 'economy' },
  // DeepSeek
  { id: 'deepseek-v3', label: 'DeepSeek V3', provider: 'deepseek', tier: 'standard' },
  { id: 'deepseek-r1', label: 'DeepSeek R1', provider: 'deepseek', tier: 'premium' },
];

/**
 * Get human-readable label for a model ID.
 */
export function getModelLabel(modelId: string): string {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.label ?? modelId;
}

const ROLE_MODEL_CONFIG: Record<string, RoleModelConfig> = {
  user: { model: 'human', temperature: 0, maxTokens: 0 },  // Human user, no AI model
  master: { model: 'claude-opus-4-5', temperature: 0.3, maxTokens: 32000, thinkingBudget: 32000 },
  orchestrator: { model: 'claude-opus-4-5', temperature: 0.3, maxTokens: 32000, thinkingBudget: 32000 },
  architect: { model: 'claude-sonnet-4-5', temperature: 0.2, maxTokens: 32000 },
  researcher: { model: 'claude-sonnet-4-5', temperature: 0.1, maxTokens: 32000 },
  implementer: { model: 'claude-sonnet-4-5', temperature: 0.3, maxTokens: 32000 },
  'qa-engineer': { model: 'claude-haiku-4', temperature: 0.1, maxTokens: 32000 },
  observer: { model: 'claude-haiku-4', temperature: 0, maxTokens: 32000 },
}

const ROLE_TOOL_PERMISSIONS: Record<string, RoleToolPermissions> = {
  user: { read: false, write: false, edit: false, bash: false, runTests: false, documentation: false, teamChat: true },  // Human user, only chat
  master: { read: true, write: true, edit: true, bash: true, runTests: true, documentation: true, teamChat: true },
  orchestrator: { read: true, write: true, edit: true, bash: true, runTests: true, documentation: true, teamChat: true },
  architect: { read: true, write: true, edit: true, bash: true, runTests: true, documentation: true, teamChat: true },
  researcher: { read: true, write: false, edit: false, bash: true, runTests: false, documentation: true, teamChat: true },
  implementer: { read: true, write: true, edit: true, bash: true, runTests: true, documentation: false, teamChat: true },
  'qa-engineer': { read: true, write: true, edit: true, bash: false, runTests: true, documentation: false, teamChat: true },
  observer: { read: true, write: true, edit: true, bash: false, runTests: false, documentation: true, teamChat: true },
}

export function getRoleModelConfig(roleId: string, modelOverride?: string): RoleModelConfig {
  const base = ROLE_MODEL_CONFIG[roleId] || { model: 'claude-sonnet-4-5', temperature: 0.2, maxTokens: 32000 };
  if (modelOverride) {
    return { ...base, model: modelOverride };
  }
  return base;
}

export function getRoleToolPermissions(roleId: string): RoleToolPermissions {
  return ROLE_TOOL_PERMISSIONS[roleId] || {
    read: true,
    write: true,
    edit: true,
    bash: true,
    runTests: false,
    documentation: false,
    teamChat: true
  };
}

export function getRoleMetadata(roleId: string): RoleMetadata {
  return {
    id: roleId,
    modelConfig: getRoleModelConfig(roleId),
    toolPermissions: getRoleToolPermissions(roleId),
  };
}

export function getLocalizedTeamRoles(): LocalizedTeamRole[] {
  // 'user' for human users, 'master' for backward compatibility alongside 'orchestrator'
  const roleKeys = ['user', 'master', 'orchestrator', 'architect', 'researcher', 'implementer', 'qa-engineer', 'observer'] as const
  const teamRoles = getTranslationSection('teamRoles')

  return roleKeys.map(roleKey => {
    const translation = teamRoles[roleKey] ?? {}
    const safeText = (value: unknown): string => typeof value === 'string' ? value : ''
    const safeTextArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter(item => typeof item === 'string') : []

    return {
      id: roleKey,
      title: safeText((translation as any).title),
      summary: safeText((translation as any).summary),
      responsibilities: safeTextArray((translation as any).responsibilities),
      abilityBoundaries: safeTextArray((translation as any).abilityBoundaries),
      handoffProtocol: safeTextArray((translation as any).handoffProtocol),
      protocol: safeTextArray((translation as any).protocol),
    }
  })
}

export function getLocalizedTeamRole(roleId: string): LocalizedTeamRole | undefined {
  const roles = getLocalizedTeamRoles()
  return roles.find(role => role.id === roleId)
}

export function getTeamRoleTitle(roleId: string): string {
  const role = getLocalizedTeamRole(roleId)
  return role?.title || roleId
}

export function getTeamRoleSummary(roleId: string): string {
  const role = getLocalizedTeamRole(roleId)
  return role?.summary || ''
}

export function getTeamRoleTitles(): Record<string, string> {
  const roles = getLocalizedTeamRoles()
  return roles.reduce((acc, role) => {
    acc[role.id] = role.title
    return acc
  }, {} as Record<string, string>)
}

export function getLocalizedTeamRolesAsArray() {
  return getLocalizedTeamRoles()
}

export default getLocalizedTeamRoles
