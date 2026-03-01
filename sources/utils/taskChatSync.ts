/**
 * Task-Chat 双向联动工具
 *
 * 实现任务系统和聊天系统的有机集成
 */

import type { KanbanTask } from '@/sync/kanbanTypes';
import type { TeamMessage, TeamMessageMetadata } from '@/sync/teamMessageTypes';

function createUuid(): string {
    if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 从消息内容中提取任务信息
 * 支持的格式：
 * - #task-123
 * - @task:456
 * - [Task:789]
 */
export function extractTaskIds(message: string): string[] {
    const patterns = [
        /#task-([a-zA-Z0-9_-]+)/gi,
        /@task:([a-zA-Z0-9_-]+)/gi,
        /\[Task:([a-zA-Z0-9_-]+)\]/gi,
    ];

    const taskIds = new Set<string>();

    patterns.forEach(pattern => {
        const matches = message.matchAll(pattern);
        for (const match of matches) {
            if (match[1]) {
                taskIds.add(match[1]);
            }
        }
    });

    return Array.from(taskIds);
}

/**
 * 创建任务相关的消息元数据
 */
export function createTaskMetadata(
    taskId: string,
    action: 'created' | 'updated' | 'assigned' | 'completed' | 'blocked',
    details?: Record<string, any>
): TeamMessageMetadata {
    return {
        taskId,
        priority: details?.priority,
        ...details,
        _action: action,
        _timestamp: Date.now(),
    };
}

/**
 * 生成任务相关的消息内容
 */
export function generateTaskMessage(
    action: 'created' | 'updated' | 'assigned' | 'completed' | 'blocked',
    task: KanbanTask,
    actorName?: string
): string {
    const actionTexts: Record<typeof action, string> = {
        created: '创建了任务',
        updated: '更新了任务',
        assigned: '分配了任务',
        completed: '完成了任务',
        blocked: '报告任务被阻塞',
    };

    const actor = actorName || '有人';
    const actionText = actionTexts[action];

    const description = task.description ? `> ${task.description}\n\n` : '';
    const priority = task.priority || '未设置';

    return `${actor} ${actionText}：**${task.title}**

${description}**状态**: ${task.status}
**优先级**: ${priority}
**查看**: #task-${task.id}`;
}

/**
 * 将任务转换为消息引用格式
 */
export function formatTaskReference(task: KanbanTask): string {
    return `#task-${task.id}`;
}

/**
 * 在消息中插入任务引用
 */
export function insertTaskReference(
    message: string,
    taskId: string,
    position: 'start' | 'end' = 'end'
): string {
    const ref = `#task-${taskId}`;

    switch (position) {
        case 'start':
            return `${ref} ${message}`;
        case 'end':
            return `${message} ${ref}`;
        default:
            return message;
    }
}

/**
 * 检测消息是否需要创建任务
 * 关键词：创建任务、new task、todo、待办
 */
export function shouldCreateTaskFromMessage(message: string): boolean {
    const keywords = [
        '创建任务',
        '新建任务',
        'new task',
        'create task',
        'todo:',
        '待办:',
        '[todo]',
        '[task]',
    ];

    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * 提取消息中的首个 @mention（用于任务默认分配）
 */
export function extractAssigneeMention(message: string): string | undefined {
    const match = message.match(/@([a-zA-Z0-9_-]+)/);
    return match?.[1];
}

/**
 * 从消息中提取任务标题和描述
 */
export function extractTaskFromMessage(message: string): {
    title: string;
    description?: string;
} | null {
    // 格式1: 标题行 + 描述
    const lines = message.split('\n').filter(line => line.trim());

    if (lines.length === 0) return null;

    // Strip all task creation keywords/prefixes
    const title = lines[0]
        .replace(/^\s*\[(?:todo|task)\]\s*/i, '')
        .replace(/^(创建任务|新建任务|待办|todo|new\s+task|create\s+task)\s*[:：]/i, '')
        .replace(/^(创建任务|新建任务)\s*/i, '')
        .trim();

    const description = lines.length > 1 ? lines.slice(1).join('\n').trim() : undefined;

    return { title, description };
}

/**
 * 创建任务更新通知消息
 */
export function createTaskUpdateMessage(
    task: KanbanTask,
    changes: {
        status?: string;
        assigneeId?: string | null;
        priority?: string;
    },
    actorName: string
): TeamMessage {
    const changeDetails = Object.entries(changes)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
            const labels = {
                status: '状态',
                assigneeId: '负责人',
                priority: '优先级',
            };
            return `${labels[key as keyof typeof labels]}: ${value}`;
        })
        .join(', ');

    return {
        id: createUuid(),
        teamId: '', // 需要外部设置
        content: generateTaskMessage('updated', task, actorName) + `\n\n变更: ${changeDetails}`,
        type: 'task-update',
        timestamp: Date.now(),
        metadata: createTaskMetadata(task.id, 'updated', changes),
        shortContent: `任务更新: ${task.title}`,
    };
}

/**
 * 渲染任务卡片（用于聊天中显示）
 */
export function renderTaskCard(task: KanbanTask): string {
    return `
┌─────────────────────────────┐
│ 📋 ${task.title}
├─────────────────────────────┤
│ 状态: ${task.status}
│ 优先级: ${task.priority || '未设置'}
│ ID: ${task.id}
└─────────────────────────────┘
    `.trim();
}

/**
 * 同步任务状态到聊天
 * 当任务状态改变时，自动发送通知消息
 */
export async function syncTaskStatusToChat(
    task: KanbanTask,
    oldStatus: string,
    newStatus: string,
    actorName: string,
    sendMessage: (message: TeamMessage) => Promise<void>
): Promise<void> {
    const message: TeamMessage = {
        id: `msg-task-${task.id}-${Date.now()}`,
        teamId: '', // 需要外部设置
        fromDisplayName: actorName,
        content: `任务状态变更：**${task.title}**\n\n${oldStatus} → ${newStatus}\n\n${formatTaskReference(task)}`,
        type: 'task-update',
        timestamp: Date.now(),
        metadata: createTaskMetadata(task.id, 'updated', {
            oldStatus,
            newStatus,
        }),
        shortContent: `任务 ${task.title}: ${oldStatus} → ${newStatus}`,
    };

    await sendMessage(message);
}

/**
 * 从聊天创建任务
 * 解析消息并创建新任务
 */
export function createTaskFromChatMessage(
    messageContent: string,
    creatorId: string
): (Pick<KanbanTask, 'title' | 'description' | 'reporterId' | 'createdAt' | 'updatedAt' | 'source' | 'taskType'> & {
    assigneeHint?: string;
}) | null {
    if (!shouldCreateTaskFromMessage(messageContent)) {
        return null;
    }

    const extracted = extractTaskFromMessage(messageContent);
    if (!extracted) {
        return null;
    }

    const title = extracted.title.trim();
    if (!title) {
        return null;
    }

    const now = Date.now();
    return {
        title,
        description: extracted.description,
        reporterId: creatorId,
        source: 'user',
        taskType: 'user',
        assigneeHint: extractAssigneeMention(messageContent),
        createdAt: now,
        updatedAt: now,
    };
}
