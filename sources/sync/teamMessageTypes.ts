/**
 * Team Message Types
 * 
 * 定义团队协作中的消息类型和接口
 */

export type TeamMessageType =
    | 'chat'                    // 普通聊天消息
    | 'task-update'             // 任务状态更新
    | 'task-created'            // 任务创建
    | 'task-assigned'           // 任务分配
    | 'notification'            // 系统通知
    | 'role-assignment'         // 角色分配
    | 'system'                  // 系统消息
    | 'collaboration-request'   // 协作请求 (P1.2)
    | 'help-needed'             // 求助消息 (P1.2)
    | 'handoff'                 // 任务交接 (P1.2)
    | 'approval-request'        // 审批请求 (P1.2)
    | 'approval-decision';      // 审批决定 (P1.2)

export type TeamMessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TeamScope {
    scopePath: string;
    scopeLabel?: string;
    repoName?: string;
    visibility?: 'scoped' | 'global';
}

/**
 * 团队消息核心接口
 */
export interface TeamMessage {
    id: string;                    // 消息唯一 ID
    teamId: string;                // 所属团队（artifact ID）
    fromSessionId?: string;        // 发送者 session ID（用户消息可为空）
    fromRole?: string;             // 发送者角色
    fromDisplayName?: string;      // 发送者显示名称
    content: string;               // 消息内容
    shortContent?: string;         // 消息摘要/短文
    type: TeamMessageType;         // 消息类型
    mentions?: string[];           // @提及的 session IDs
    timestamp: number;             // 时间戳
    metadata?: TeamMessageMetadata; // 扩展元数据
}

/**
 * 任务快照（用于在消息中显示任务状态）
 */
export interface TaskSnapshot {
    id: string;
    title: string;
    status: string;
    priority?: string;
}

/**
 * 消息元数据
 */
export interface TeamMessageMetadata {
    taskId?: string;               // 关联的任务 ID
    taskSnapshot?: TaskSnapshot;   // 任务快照
    taskChange?: {                 // 任务变更详情
        field: string;
        oldValue: any;
        newValue: any;
    };
    todoId?: string;               // 关联的 Todo ID
    priority?: TeamMessagePriority; // 优先级
    replyToId?: string;            // 回复的消息 ID
    attachmentIds?: string[];      // 附件 IDs（未来支持）
    edited?: boolean;              // 是否已编辑
    editedAt?: number;             // 编辑时间
    reactions?: MessageReaction[]; // 消息反应
    handshake?: {
        type?: string;
        version?: string;
        payload?: Record<string, any>;
    };
    scope?: TeamScope;
    reviewContext?: {
        commitHash?: string;
        scopePath?: string;
        repoName?: string;
    };
    [key: string]: any;
}

/**
 * 消息反应
 */
export interface MessageReaction {
    emoji: string;
    sessionIds: string[];
}

/**
 * 消息发送请求
 */
export interface SendTeamMessageRequest {
    teamId: string;
    id?: string;
    content: string;
    type?: TeamMessageType;
    mentions?: string[];
    metadata?: TeamMessageMetadata;
    fromSessionId?: string;
    fromRole?: string;
    fromDisplayName?: string;
}

/**
 * 消息列表响应
 */
export interface TeamMessageListResponse {
    messages: TeamMessage[];
    hasMore: boolean;
    cursor?: string;
}

export interface TeamMessageListParams {
    limit?: number;
    before?: string;
    scopePath?: string;
    repoName?: string;
    includeGlobal?: boolean;
}

/**
 * 团队频道订阅信息
 */
export interface TeamChannelSubscription {
    teamId: string;
    sessionId: string;
    role: string;
    joinedAt: number;
}

export interface TeamMentionCandidate {
    sessionId: string;
    displayName?: string;
    roleId?: string;
    aliases?: string[];
}

function normalizeMentionLookupKey(value: string): string {
    return value
        .trim()
        .replace(/^@+/, '')
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-');
}

function isLikelyFullSessionId(value: string): boolean {
    return /^[a-z0-9]{16,}$/i.test(value.trim());
}

export function extractMentionTokens(text: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9-_]+)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
}

export function canonicalizeTeamMentions(
    rawMentions: string[] | undefined,
    candidates: TeamMentionCandidate[]
): string[] {
    if (!rawMentions?.length) {
        return [];
    }

    const aliasMap = new Map<string, Set<string>>();
    const registerAlias = (alias: string | undefined, sessionId: string) => {
        if (!alias) {
            return;
        }

        const normalized = normalizeMentionLookupKey(alias);
        if (!normalized) {
            return;
        }

        const existing = aliasMap.get(normalized) ?? new Set<string>();
        existing.add(sessionId);
        aliasMap.set(normalized, existing);
    };

    candidates.forEach((candidate) => {
        registerAlias(candidate.sessionId, candidate.sessionId);
        registerAlias(candidate.displayName, candidate.sessionId);
        registerAlias(candidate.roleId, candidate.sessionId);
        candidate.aliases?.forEach((alias) => registerAlias(alias, candidate.sessionId));
    });

    const canonicalMentions: string[] = [];

    rawMentions.forEach((rawMention) => {
        const normalized = normalizeMentionLookupKey(rawMention);
        if (!normalized) {
            return;
        }

        let resolvedSessionId: string | null = null;

        const aliasMatches = aliasMap.get(normalized);
        if (aliasMatches?.size === 1) {
            resolvedSessionId = [...aliasMatches][0];
        } else if (!aliasMatches || aliasMatches.size === 0) {
            const prefixMatches = candidates.filter((candidate) =>
                normalizeMentionLookupKey(candidate.sessionId).startsWith(normalized)
            );

            if (prefixMatches.length === 1) {
                resolvedSessionId = prefixMatches[0].sessionId;
            } else if (isLikelyFullSessionId(normalized)) {
                resolvedSessionId = rawMention.trim().replace(/^@+/, '');
            }
        }

        if (resolvedSessionId && !canonicalMentions.includes(resolvedSessionId)) {
            canonicalMentions.push(resolvedSessionId);
        }
    });

    return canonicalMentions;
}

/**
 * WebSocket 消息：团队消息更新
 */
export interface TeamMessageUpdate {
    type: 'team-message';
    teamId: string;
    message: TeamMessage;
}

/**
 * WebSocket 消息：成员在线状态
 */
export interface TeamMemberPresence {
    type: 'team-member-presence';
    teamId: string;
    sessionId: string;
    online: boolean;
    lastSeen?: number;
}

/**
 * 团队消息上下文（注入到 CLI session）
 */
export interface TeamMessageContext {
    teamId: string;
    teamName: string;
    myRole: string;
    message: TeamMessage;
    isMentioned: boolean;
    shouldRespond: boolean; // 根据规则计算是否需要响应
}

/**
 * CLI Context Injection 格式
 */
export function formatMessageForInjection(context: TeamMessageContext): string {
    const mentionTag = context.isMentioned ? '[MENTIONED]' : '';
    const urgentTag = context.message.metadata?.priority === 'urgent' ? '[URGENT]' : '';

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 Team Message ${mentionTag} ${urgentTag}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team: ${context.teamName}
From: ${context.message.fromDisplayName || context.message.fromSessionId || 'unknown'} (${context.message.fromRole || 'unknown'})
Type: ${context.message.type}
Time: ${new Date(context.message.timestamp).toLocaleString()}

${context.message.content}

${context.isMentioned ? `
⚠️  You were mentioned in this message.
👤 Sender: ${context.message.fromDisplayName || context.message.fromSessionId || 'unknown'}
💡 Your role: ${context.myRole}
${context.shouldRespond ? '📌 Response expected based on team protocol' : ''}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * 判断消息是否需要响应
 */
// === P1.2: Collaboration Protocol Types ===

/**
 * 协作请求类型
 */
export type CollaborationRequestType = 'review' | 'pair' | 'consult' | 'escalate' | 'delegate';

/**
 * 协作请求紧急程度
 */
export type CollaborationUrgency = 'low' | 'normal' | 'high' | 'blocking';

/**
 * 协作请求
 */
export interface CollaborationRequest {
    requestType: CollaborationRequestType;
    taskId: string;
    requestingRole: string;
    targetRoles: string[];
    urgency: CollaborationUrgency;
    context: string;
    expectedOutcome?: string;
}

/**
 * 求助请求
 */
export interface HelpNeededRequest {
    taskId: string;
    blockerType: 'dependency' | 'question' | 'resource' | 'technical' | 'unknown';
    description: string;
    attemptedSolutions?: string[];
    targetRoles?: string[];
}

/**
 * 任务交接请求
 */
export interface HandoffRequest {
    taskId: string;
    fromRole: string;
    toRole: string;
    reason: 'completion' | 'reassignment' | 'escalation' | 'specialization';
    summary: string;
    nextSteps?: string[];
    attachments?: string[];
}

/**
 * 审批请求
 */
export interface ApprovalRequestPayload {
    taskId: string;
    approvalType: 'task-completion' | 'task-creation' | 'scope-change' | 'resource-request';
    requestedBy: string;
    requestedByRole: string;
    priority: TeamMessagePriority;
    context?: string;
}

/**
 * 审批决定
 */
export interface ApprovalDecisionPayload {
    taskId: string;
    decision: 'approved' | 'rejected';
    decidedBy: string;
    decidedByRole: string;
    reason?: string;
    conditions?: string[];
}

export function shouldRespondToMessage(
    message: TeamMessage,
    mySessionId: string,
    myRole: string
): boolean {
    // 1. 被直接 @mention
    if (message.mentions?.includes(mySessionId)) {
        return true;
    }

    // 2. Urgent 优先级
    if (message.metadata?.priority === 'urgent') {
        return true;
    }

    // 3. 任务相关且涉及自己的角色
    if (message.type === 'task-update' && message.metadata?.taskId) {
        // 这里需要查询任务是否分配给自己，暂时返回 false
        return false;
    }

    // 4. 来自 orchestrator 的消息（特殊处理）
    if (message.type === 'chat' && ['orchestrator', 'master'].includes(message.fromRole || '')) {
        // Implementer 和 Architect 应该关注 orchestrator 的指令
        if (['implementer', 'architect', 'builder', 'framer'].includes(myRole)) {
            return true;
        }
    }

    // 默认不需要响应
    return false;
}
