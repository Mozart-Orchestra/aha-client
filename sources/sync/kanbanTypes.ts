import {
    TEAM_ROLE_LIBRARY,
    DEFAULT_TEAM_AGREEMENTS as SHARED_TEAM_AGREEMENTS,
    DEFAULT_KANBAN_BOARD as SHARED_KANBAN_BOARD
} from '@happy/shared-team-config';

export interface KanbanColumn {
    id: string;
    title: string;
}

// 任务执行链接 - 追踪哪个 Session 正在执行任务
export interface TaskExecutionLink {
    sessionId: string;
    linkedAt: number;
    role: 'primary' | 'supporting';  // primary = 主要执行者, supporting = 协助
    status: 'active' | 'completed' | 'abandoned';
}

// 任务阻塞记录
export interface TaskBlocker {
    id: string;
    type: 'dependency' | 'question' | 'resource' | 'technical';
    description: string;
    raisedAt: number;
    raisedBy?: string;  // Session ID
    resolvedAt?: number;
    resolvedBy?: string;
    resolution?: string;
}

// 状态传播配置
export interface StatusPropagation {
    autoCompleteParent: boolean;      // 所有子任务 done → 父任务 review
    blockParentOnBlocked: boolean;    // 子任务 blocked → 父任务标记
    cascadeDeleteSubtasks: boolean;   // 父任务删除 → 子任务级联删除
}

export const DEFAULT_STATUS_PROPAGATION: StatusPropagation = {
    autoCompleteParent: true,
    blockParentOnBlocked: true,
    cascadeDeleteSubtasks: false
};

export interface KanbanTask {
    id: string;
    title: string;
    description?: string;
    status: string;
    assigneeId?: string | null;
    reporterId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: number;
    updatedAt: number;

    // 🆕 嵌套任务支持
    parentTaskId?: string | null;     // 父任务 ID (null/undefined = 顶级任务)
    subtaskIds?: string[];            // 子任务 ID 列表 (有序)
    depth?: number;                   // 嵌套深度 (0=顶级, 1=一级子任务...)

    // 🆕 状态传播配置
    statusPropagation?: StatusPropagation;
    hasBlockedChild?: boolean;        // 是否有子任务被阻塞

    // 🆕 执行链接 - Session 与任务的关联
    executionLinks?: TaskExecutionLink[];

    // 🆕 阻塞追踪
    blockers?: TaskBlocker[];
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
    columns: SHARED_KANBAN_BOARD.columns.map(column => ({ ...column })),
    tasks: [],
    team: {
        members: [],
        roles: DEFAULT_TEAM_ROLES.map(cloneRole),
        agreements: { ...DEFAULT_TEAM_AGREEMENTS }
    }
};
