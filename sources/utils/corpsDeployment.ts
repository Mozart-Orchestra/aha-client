import {
    DEFAULT_KANBAN_BOARD,
    DEFAULT_TEAM_AGREEMENTS,
    DEFAULT_TEAM_ROLES,
    type KanbanBoard,
    type KanbanTeamMember,
} from '@/sync/kanbanTypes';

import type { CorpsSpec } from './genomeHub';

export interface ParsedCorpsGenomeRef {
    namespace: string;
    name: string;
}

export interface CorpsMemberPlan {
    genomeRef: string;
    namespace: string | null;
    genomeName: string | null;
    roleId: string;
    ordinal: number;
    required: boolean;
    displayName: string;
}

export function parseCorpsGenomeRef(ref: string): ParsedCorpsGenomeRef | null {
    const trimmed = ref.trim();
    const slashIndex = trimmed.indexOf('/');

    if (!trimmed.startsWith('@') || slashIndex <= 1 || slashIndex >= trimmed.length - 1) {
        return null;
    }

    return {
        namespace: trimmed.slice(0, slashIndex),
        name: trimmed.slice(slashIndex + 1),
    };
}

export function resolveCorpsRoleId(member: CorpsSpec['members'][number]): string {
    const alias = member.roleAlias?.trim();
    if (alias) {
        return alias;
    }

    return parseCorpsGenomeRef(member.genome)?.name ?? 'member';
}

function formatRoleDisplay(roleId: string): string {
    return roleId
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function expandCorpsMemberPlans(corps: CorpsSpec): CorpsMemberPlan[] {
    const plans: CorpsMemberPlan[] = [];

    for (const member of corps.members ?? []) {
        const count = Math.max(1, member.count ?? 1);
        const roleId = resolveCorpsRoleId(member);
        const parsedRef = parseCorpsGenomeRef(member.genome);
        const required = member.required !== false;

        for (let ordinal = 1; ordinal <= count; ordinal += 1) {
            plans.push({
                genomeRef: member.genome,
                namespace: parsedRef?.namespace ?? null,
                genomeName: parsedRef?.name ?? null,
                roleId,
                ordinal,
                required,
                displayName: count > 1
                    ? `${formatRoleDisplay(roleId)} ${ordinal}`
                    : formatRoleDisplay(roleId),
            });
        }
    }

    return plans;
}

export function getDefaultCorpsTeamName(genomeName: string, corps: CorpsSpec): string {
    const bootName = corps.bootContext?.teamDescription?.trim();
    if (bootName) {
        return bootName;
    }

    const description = corps.description?.trim();
    if (description) {
        return description;
    }

    return genomeName;
}

export function buildCorpsSeedBoard({
    name,
    corps,
    members,
}: {
    name: string;
    corps: CorpsSpec;
    members: KanbanTeamMember[];
}): KanbanBoard {
    const board = JSON.parse(JSON.stringify(DEFAULT_KANBAN_BOARD)) as KanbanBoard;
    const initialObjective = corps.bootContext?.initialObjective?.trim();

    board.team = {
        ...(board.team ?? {}),
        members: [...members],
        roles: DEFAULT_TEAM_ROLES.map((role) => JSON.parse(JSON.stringify(role))),
        agreements: { ...DEFAULT_TEAM_AGREEMENTS },
    };

    if (initialObjective) {
        board.tasks.push({
            id: 'team-goal',
            title: `Team Goal: ${initialObjective}`,
            description: 'This is the primary objective for this team.',
            status: 'todo',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }

    return board;
}
