import {
    TEAM_ROLE_LIBRARY,
    DEFAULT_TEAM_AGREEMENTS as SHARED_TEAM_AGREEMENTS,
    DEFAULT_KANBAN_BOARD as SHARED_KANBAN_BOARD
} from '@happy/shared-team-config';

export interface KanbanColumn {
    id: string;
    title: string;
}

export interface KanbanTask {
    id: string;
    title: string;
    description?: string;
    status: string; // Should match a column id
    assigneeId?: string | null; // Session ID of the assigned agent
    reporterId?: string; // Session ID of the creator
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: number;
    updatedAt: number;
}

export interface KanbanBoard {
    columns: KanbanColumn[];
    tasks: KanbanTask[];
    team?: KanbanTeam;
}

export interface KanbanTeamMember {
    sessionId: string;
    roleId: string;
    displayName?: string;
    focusAreas?: string[];
}

export interface KanbanTeamRole {
    id: string;
    title: string;
    summary: string;
    responsibilities: string[];
    abilityBoundaries: string[];
    handoffProtocol: string[];
    protocol: string[];
    policy?: {
        autoStartMaster?: boolean;
        permissionMode?: string;
        watchers?: string[];
        accessLevel?: 'read-only' | 'full-access';
        disallowedTools?: string[];
    };
}

export interface KanbanTeamAgreement {
    statusUpdates: string;
    handoffs: string;
    escalation: string;
    definitionOfDone: string;
}

export interface KanbanTeam {
    members: KanbanTeamMember[];
    roles: KanbanTeamRole[];
    agreements: KanbanTeamAgreement;
}

const cloneRole = (role: (typeof TEAM_ROLE_LIBRARY)[number]): KanbanTeamRole => ({
    id: role.id,
    title: role.title,
    summary: role.summary,
    responsibilities: [...role.responsibilities],
    abilityBoundaries: [...role.abilityBoundaries],
    handoffProtocol: [...role.handoffProtocol],
    protocol: [...role.protocol],
    policy: role.policy ? {
        ...role.policy,
        watchers: role.policy.watchers ? [...role.policy.watchers] : undefined,
        disallowedTools: role.policy.disallowedTools ? [...role.policy.disallowedTools] : undefined
    } : undefined
});

export const DEFAULT_TEAM_ROLES: KanbanTeamRole[] = TEAM_ROLE_LIBRARY.map(cloneRole);

export const DEFAULT_TEAM_AGREEMENTS: KanbanTeamAgreement = {
    ...SHARED_TEAM_AGREEMENTS
};

export const DEFAULT_KANBAN_BOARD: KanbanBoard = {
    columns: SHARED_KANBAN_BOARD.columns.map((column): KanbanColumn => ({ ...column })),
    tasks: [],
    team: {
        members: [],
        roles: DEFAULT_TEAM_ROLES.map(cloneRole),
        agreements: { ...DEFAULT_TEAM_AGREEMENTS }
    }
};
