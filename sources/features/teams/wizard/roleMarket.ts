import type { CustomRole, PublicRole, RoleMarketRole, RoleTemplate } from '@/sync/apiRoles';
import type { KanbanTeamRole } from '@/sync/kanbanTypes';
import { generateRoleId, type RoleConfig } from './types';

export type RoleMarketSource = 'built-in' | 'default' | 'custom' | 'public';

export interface RoleMarketOption {
    id: string;
    title: string;
    summary: string;
    icon?: string;
    source: RoleMarketSource;
    ownerId?: string;
    assignedSkills?: string[];
    stats?: PublicRole['stats'];
    market?: RoleMarketRole;
}

interface BuildRoleMarketOptionsParams {
    builtInRoles: KanbanTeamRole[];
    defaultRoles: RoleTemplate[];
    customRoles: CustomRole[];
    publicRoles: PublicRole[];
}

const REVIEW_KEYWORDS = ['qa', 'review', 'master', 'lead', 'observer'];

function normalizeKeyword(value: string): string {
    return value.trim().toLowerCase();
}

export function resolveRoleDefaultMode(roleId: string, roleTitle?: string): RoleConfig['mode'] {
    const normalizedId = normalizeKeyword(roleId);
    const normalizedTitle = normalizeKeyword(roleTitle || '');

    if (normalizedId === 'builder' || normalizedId === 'implementer') {
        return 'codex';
    }

    const looksReviewFocused = REVIEW_KEYWORDS.some((keyword) =>
        normalizedId.includes(keyword) || normalizedTitle.includes(keyword)
    );

    return looksReviewFocused ? 'claude-code' : 'codex';
}

export function buildRoleMarketOptions({
    builtInRoles,
    defaultRoles,
    customRoles,
    publicRoles,
}: BuildRoleMarketOptionsParams): RoleMarketOption[] {
    const builtInOptions: RoleMarketOption[] = builtInRoles.map((role) => ({
        id: role.id,
        title: role.title,
        summary: role.summary || 'Built-in role',
        source: 'built-in',
    }));

    const builtInIds = new Set(builtInOptions.map((role) => role.id));

    const defaultOptions: RoleMarketOption[] = defaultRoles
        .filter((role) => !builtInIds.has(role.id))
        .map((role) => ({
            id: role.id,
            title: role.title,
            summary: role.summary || 'Default role',
            icon: role.icon,
            source: 'default',
        }));

    const defaultIds = new Set(defaultOptions.map((role) => role.id));

    const customOptions: RoleMarketOption[] = customRoles
        .filter((role) => !builtInIds.has(role.id) && !defaultIds.has(role.id))
        .map((role) => ({
            id: role.id,
            title: role.title,
            summary: role.summary || 'Custom role',
            icon: role.icon,
            source: 'custom',
            ownerId: role.ownerId,
            assignedSkills: role.assignedSkills,
            stats: role.stats,
        }));

    const customIds = new Set(customOptions.map((role) => role.id));

    const publicOptions: RoleMarketOption[] = publicRoles
        .filter((role) => !builtInIds.has(role.id) && !defaultIds.has(role.id) && !customIds.has(role.id))
        .map((role) => ({
            id: role.id,
            title: role.title,
            summary: role.summary || 'Public role',
            icon: role.icon,
            source: 'public',
            ownerId: role.ownerId,
            assignedSkills: role.assignedSkills,
            stats: role.stats,
        }));

    return [...builtInOptions, ...defaultOptions, ...customOptions, ...publicOptions];
}

export function filterRoleMarketOptions(roles: RoleMarketOption[], query: string): RoleMarketOption[] {
    const normalizedQuery = normalizeKeyword(query);
    if (!normalizedQuery) {
        return roles;
    }

    const normalizedSkillQuery = normalizedQuery.startsWith('#')
        ? normalizedQuery.slice(1)
        : normalizedQuery;

    return roles.filter((role) => {
        const haystacks = [
            role.id,
            role.title,
            role.summary,
            role.source,
            role.market?.variant.label || '',
            role.market?.access.label || '',
            role.market?.score?.toString() || '',
            role.stats?.averageRating?.toString() || '',
            role.stats?.reviewCount?.toString() || '',
            ...(role.market?.goalMatches || []),
            ...(role.market?.why || []),
            ...(role.assignedSkills || []),
        ].map((value) => normalizeKeyword(value));

        return haystacks.some((value) => value.includes(normalizedQuery) || value.includes(normalizedSkillQuery));
    });
}

export function applyRoleMarketInsights(
    roles: RoleMarketOption[],
    marketRoles: RoleMarketRole[],
): RoleMarketOption[] {
    const keyedInsights = new Map<string, RoleMarketRole>();
    const fallbackById = new Map<string, RoleMarketRole>();

    marketRoles.forEach((role) => {
        keyedInsights.set(`${role.source}:${role.id}`, role);
        if (!fallbackById.has(role.id)) {
            fallbackById.set(role.id, role);
        }
    });

    return roles.map((role) => {
        const exact = keyedInsights.get(`${role.source}:${role.id}`);
        const fallback = fallbackById.get(role.id);
        const market = exact || fallback;

        if (!market) {
            return role;
        }

        return {
            ...role,
            summary: market.summary || role.summary,
            assignedSkills: market.assignedSkills.length > 0 ? market.assignedSkills : role.assignedSkills,
            stats: market.stats || role.stats,
            market,
        };
    });
}

export function buildRecommendedRoleMarketOptions(
    roles: RoleMarketOption[],
    existingRoleIds: string[] = [],
    limit = 4,
): RoleMarketOption[] {
    const existingRoleIdSet = new Set(existingRoleIds);

    return roles
        .filter((role) => role.market && !existingRoleIdSet.has(role.id))
        .sort((left, right) => {
            const rightScore = right.market?.score || 0;
            const leftScore = left.market?.score || 0;
            if (rightScore !== leftScore) {
                return rightScore - leftScore;
            }

            const rightReviews = right.market?.stats?.reviewCount || 0;
            const leftReviews = left.market?.stats?.reviewCount || 0;
            if (rightReviews !== leftReviews) {
                return rightReviews - leftReviews;
            }

            return left.title.localeCompare(right.title);
        })
        .slice(0, limit);
}

export function buildRoleMarketSkillSuggestions(roles: RoleMarketOption[], limit = 6): string[] {
    const counts = new Map<string, number>();

    roles.forEach((role) => {
        role.assignedSkills?.forEach((skill) => {
            const normalizedSkill = skill.trim();
            if (!normalizedSkill) {
                return;
            }
            counts.set(normalizedSkill, (counts.get(normalizedSkill) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, limit)
        .map(([skill]) => skill);
}

export function createRoleConfigFromMarketRole(role: RoleMarketOption, machineId?: string): RoleConfig {
    return {
        id: generateRoleId(),
        roleId: role.id,
        roleName: role.title,
        quantity: 1,
        mode: resolveRoleDefaultMode(role.id, role.title),
        machineId,
        skills: role.assignedSkills,
    };
}
