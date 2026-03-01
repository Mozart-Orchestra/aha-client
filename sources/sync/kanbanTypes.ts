import {
    TEAM_ROLE_LIBRARY,
    DEFAULT_TEAM_AGREEMENTS as SHARED_TEAM_AGREEMENTS,
    DEFAULT_KANBAN_BOARD as SHARED_KANBAN_BOARD,
    DEFAULT_STATUS_PROPAGATION as SHARED_STATUS_PROPAGATION,
    DEFAULT_NESTED_TASK_SETTINGS as SHARED_NESTED_TASK_SETTINGS
} from '@aha/shared-team-config';
import type { SharedNestedTaskSettings, SharedStatusPropagation } from '@aha/shared-team-config';

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
export type StatusPropagation = SharedStatusPropagation;

export type NestedTaskSettings = SharedNestedTaskSettings;

export const DEFAULT_STATUS_PROPAGATION: StatusPropagation = {
    ...(SHARED_STATUS_PROPAGATION ?? {
        autoCompleteParent: true,
        blockParentOnBlocked: true,
        cascadeDeleteSubtasks: false
    })
};

const DEFAULT_EXECUTION_SETTINGS: NestedTaskSettings['execution'] = {
    ...(SHARED_NESTED_TASK_SETTINGS?.execution ?? {
        requirePlan: true,
        autoLinkSessions: true,
        broadcastStatus: true
    })
};

const DEFAULT_NESTED_TASK_SETTINGS: NestedTaskSettings = {
    maxDepth: SHARED_NESTED_TASK_SETTINGS?.maxDepth ?? 3,
    statusPropagation: { ...DEFAULT_STATUS_PROPAGATION },
    execution: { ...DEFAULT_EXECUTION_SETTINGS }
};

const cloneNestedTaskSettings = (settings?: NestedTaskSettings): NestedTaskSettings | undefined => {
    if (!settings) return undefined;
    return {
        ...settings,
        statusPropagation: { ...settings.statusPropagation },
        execution: { ...settings.execution }
    };
};

const cloneNestedTaskSettingsOrDefault = (settings?: NestedTaskSettings): NestedTaskSettings =>
    cloneNestedTaskSettings(settings) ?? cloneNestedTaskSettings(DEFAULT_NESTED_TASK_SETTINGS)!;

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

    // 🆕 Chat-Board 集成
    relatedMessageIds?: string[];     // 关联的聊天消息ID列表
    dueDate?: number;                 // 截止日期
    tags?: string[];                  // 任务标签

    // 🆕 Todo 集成
    todoId?: string;                  // 关联的 Todo 项 ID
    linkedSessionIds?: string[];      // 相关的会话 IDs (从 Todo 继承)

    // 🆕 任务来源和审批
    source?: 'ai' | 'user' | 'todo';  // 任务来源
    taskType?: 'user' | 'internal';   // 任务类型（用户任务 / 内部任务）
    sourceMessageId?: string;         // 来源消息 ID（如果从聊天创建）
    approvalStatus?: 'pending' | 'approved' | 'rejected'; // 审批状态
    rejectionReason?: string;         // 拒绝原因
    approvedBy?: string[];            // 审批者 IDs
    rejectedBy?: string[];            // 拒绝者 IDs
    reassignedBy?: string[];          // 重新分配执行者 IDs
    reassignedAt?: number | null;     // 重新分配时间
    isDeleted?: boolean;              // 删除标记
    deletedAt?: number | null;        // 删除时间
    deletionReason?: string;          // 删除原因

    // 🆕 依赖关系
    dependencies?: string[];          // 依赖的任务 IDs
    blocks?: string[];                // 阻塞的任务 IDs

    // 🆕 附件和检查清单
    attachments?: TaskAttachment[];   // 附件（文件、截图等）
    checklists?: TaskChecklist[];     // 任务检查清单
    comments?: TaskComment[];         // 任务评论
}

// 🆕 任务附件
export interface TaskAttachment {
    id: string;
    type: 'file' | 'image' | 'link' | 'code';
    name: string;
    url?: string;
    content?: string;
    createdAt: number;
    createdBy?: string;
}

// 🆕 任务检查清单
export interface TaskChecklist {
    id: string;
    title: string;
    items: TaskChecklistItem[];
}

export interface TaskChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: number;
    completedBy?: string;
}

// 🆕 任务评论
export interface TaskComment {
    id: string;
    sessionId: string;
    displayName: string;
    content: string;
    createdAt: number;
    updatedAt?: number;
}

export interface KanbanBoard {
    columns: KanbanColumn[];
    tasks: KanbanTask[];
    roomId?: string;
    taskSettings?: NestedTaskSettings;
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
        coordinationMode?: 'strong' | 'weak';
        taskSettings?: NestedTaskSettings;
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
        disallowedTools: role.policy.disallowedTools ? [...role.policy.disallowedTools] : undefined,
        taskSettings: cloneNestedTaskSettings(role.policy.taskSettings)
    } : undefined
});

export const DEFAULT_TEAM_ROLES: KanbanTeamRole[] = TEAM_ROLE_LIBRARY.map(cloneRole);

export const DEFAULT_TEAM_AGREEMENTS: KanbanTeamAgreement = {
    ...SHARED_TEAM_AGREEMENTS
};

export const DEFAULT_KANBAN_BOARD: KanbanBoard = {
    columns: SHARED_KANBAN_BOARD.columns.map((column): KanbanColumn => ({ ...column })),
    tasks: [],
    taskSettings: cloneNestedTaskSettingsOrDefault(
        ('taskSettings' in SHARED_KANBAN_BOARD ? SHARED_KANBAN_BOARD.taskSettings : undefined)
    ),
    team: {
        members: [],
        roles: DEFAULT_TEAM_ROLES.map(cloneRole),
        agreements: { ...DEFAULT_TEAM_AGREEMENTS }
    }
};
