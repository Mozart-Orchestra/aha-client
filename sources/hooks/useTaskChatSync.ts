/**
 * Task-Chat 同步 Hook
 *
 * 提供任务和聊天双向联动的 React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { randomUUID } from 'expo-crypto';
import type { KanbanTask } from '@/sync/kanbanTypes';
import type { TeamMessage } from '@/sync/teamMessageTypes';
import {
    extractTaskIds,
    createTaskUpdateMessage,
    syncTaskStatusToChat,
    createTaskFromChatMessage,
    formatTaskReference,
} from '@/utils/taskChatSync';

interface UseTaskChatSyncOptions {
    teamId: string;
    tasks: KanbanTask[];
    messages: TeamMessage[];
    onTaskUpdate?: (taskId: string, updates: Partial<KanbanTask>) => Promise<void>;
    onMessageSend?: (message: TeamMessage) => Promise<void>;
    onMessageUpdate?: (message: TeamMessage) => Promise<void>;
    onTaskCreate?: (task: Partial<KanbanTask>) => Promise<KanbanTask>;
    defaultUserTaskAssigneeId?: string;
    resolveMentionToSessionId?: (mention: string) => string | undefined;
}

interface TaskChatLink {
    taskId: string;
    messageIds: string[];
    lastUpdate: number;
}

export function useTaskChatSync(options: UseTaskChatSyncOptions) {
    const {
        teamId,
        tasks,
        messages,
        onTaskUpdate,
        onMessageSend,
        onMessageUpdate,
        onTaskCreate,
        defaultUserTaskAssigneeId,
        resolveMentionToSessionId,
    } = options;

    // 任务-消息映射
    const [taskLinks, setTaskLinks] = useState<Map<string, TaskChatLink>>(new Map());

    // 解析消息中的任务引用
    useEffect(() => {
        const links = new Map<string, TaskChatLink>();

        messages.forEach(message => {
            const taskIds = extractTaskIds(message.content);

            taskIds.forEach(taskId => {
                const existing = links.get(taskId);
                if (existing) {
                    existing.messageIds.push(message.id);
                    existing.lastUpdate = Math.max(existing.lastUpdate, message.timestamp);
                } else {
                    links.set(taskId, {
                        taskId,
                        messageIds: [message.id],
                        lastUpdate: message.timestamp,
                    });
                }
            });
        });

        // 检查消息元数据中的 taskId
        messages.forEach(message => {
            const taskId = message.metadata?.taskId;
            if (taskId) {
                const existing = links.get(taskId);
                if (existing) {
                    if (!existing.messageIds.includes(message.id)) {
                        existing.messageIds.push(message.id);
                    }
                    existing.lastUpdate = Math.max(existing.lastUpdate, message.timestamp);
                } else {
                    links.set(taskId, {
                        taskId,
                        messageIds: [message.id],
                        lastUpdate: message.timestamp,
                    });
                }
            }
        });

        setTaskLinks(links);
    }, [messages]);

    /**
     * 获取与任务相关的所有消息
     */
    const getMessagesForTask = useCallback((taskId: string): TeamMessage[] => {
        const link = taskLinks.get(taskId);
        if (!link) return [];

        return messages.filter(msg => link.messageIds.includes(msg.id));
    }, [messages, taskLinks]);

    /**
     * 获取与消息相关的任务
     */
    const getTasksForMessage = useCallback((messageId: string): KanbanTask[] => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return [];

        const taskIds = extractTaskIds(message.content);
        if (message.metadata?.taskId) {
            taskIds.push(message.metadata.taskId);
        }

        return tasks.filter(task => taskIds.includes(task.id));
    }, [messages, tasks]);

    const getTaskById = useCallback((taskId: string): KanbanTask | undefined => {
        return tasks.find(task => task.id === taskId);
    }, [tasks]);

    /**
     * 更新任务并同步到聊天
     */
    const updateTaskWithSync = useCallback(async (
        taskId: string,
        updates: Partial<KanbanTask>,
        actorName: string = '用户'
    ): Promise<void> => {
        const existingTask = tasks.find(t => t.id === taskId);
        const mergedTask = existingTask ? { ...existingTask, ...updates } : undefined;

        // 1. 更新任务
        await onTaskUpdate?.(taskId, updates);

        // 2. 发送通知到聊天
        if (!mergedTask) return;

        const message = createTaskUpdateMessage(mergedTask, updates, actorName);
        message.teamId = teamId;

        await onMessageSend?.(message);
    }, [tasks, teamId, onTaskUpdate, onMessageSend]);

    /**
     * 从聊天消息创建任务
     */
    const createTaskFromMessage = useCallback(async (
        messageContent: string,
        creatorId: string,
        creatorName: string = '用户'
    ): Promise<KanbanTask | null> => {
        const taskData = createTaskFromChatMessage(messageContent, creatorId);
        if (!taskData) {
            return null;
        }

        const assigneeFromMention = taskData.assigneeHint
            ? resolveMentionToSessionId?.(taskData.assigneeHint)
            : undefined;
        const assigneeId = assigneeFromMention || defaultUserTaskAssigneeId;
        const { assigneeHint: _assigneeHint, ...taskPayload } = taskData;

        // 创建任务
        const task = await onTaskCreate?.({
            ...taskPayload,
            ...(assigneeId ? { assigneeId } : {}),
        });
        if (!task) {
            return null;
        }

        // 发送确认消息到聊天
        const confirmationMessage: TeamMessage = {
            id: `msg-confirm-${randomUUID()}`,
            teamId,
            fromDisplayName: creatorName,
            content: `✅ 已创建任务：**${task.title}**\n\n${formatTaskReference(task)}`,
            type: 'task-update',
            timestamp: Date.now(),
            metadata: {
                taskId: task.id,
                _action: 'created',
            },
            shortContent: `任务已创建: ${task.title}`,
        };

        await onMessageSend?.(confirmationMessage);

        return task;
    }, [teamId, onTaskCreate, onMessageSend, defaultUserTaskAssigneeId, resolveMentionToSessionId]);

    const createTaskDirect = useCallback(async (
        taskData: Partial<KanbanTask>,
        creatorName: string = '用户'
    ): Promise<KanbanTask | null> => {
        if (!onTaskCreate) return null;

        const source = taskData.source || 'user';
        const taskType = taskData.taskType || (source === 'ai' ? 'internal' : 'user');
        const assigneeId = taskData.assigneeId || (taskType === 'user' ? defaultUserTaskAssigneeId : undefined);

        const created = await onTaskCreate({
            ...taskData,
            source,
            taskType,
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            approvalStatus: taskData.approvalStatus || (source === 'ai' ? 'pending' : 'approved'),
            ...(assigneeId ? { assigneeId } : {}),
        });

        const typeLabel = created.taskType === 'internal' ? '内部任务' : '用户任务';
        const notificationMessage: TeamMessage = {
            id: `msg-task-direct-${randomUUID()}`,
            teamId,
            fromDisplayName: creatorName,
            content: `✅ 已创建任务：**${created.title}**\n\n类型: ${typeLabel}\n优先级: ${created.priority || 'medium'}\n${formatTaskReference(created)}`,
            type: 'task-created',
            timestamp: Date.now(),
            mentions: created.assigneeId ? [created.assigneeId] : undefined,
            metadata: {
                taskId: created.id,
                _action: 'created',
                taskType: created.taskType,
                source: created.source,
            },
            shortContent: `任务已创建: ${created.title}`,
        };

        await onMessageSend?.(notificationMessage);
        return created;
    }, [onTaskCreate, onMessageSend, teamId, defaultUserTaskAssigneeId]);

    /**
     * 将消息关联到现有任务
     */
    const linkMessageToTask = useCallback(async (
        messageId: string,
        taskId: string,
        actorName: string = '用户',
        messageOverride?: TeamMessage
    ): Promise<void> => {
        const message = messages.find(m => m.id === messageId) ?? messageOverride;
        const task = tasks.find(t => t.id === taskId);

        if (!message || !task) return;

        // 更新消息，添加任务引用
        const updatedContent = message.content.includes(`#task-${taskId}`)
            ? message.content
            : `${message.content}\n\n${formatTaskReference(task)}`;

        const updatedMessage: TeamMessage = {
            ...message,
            content: updatedContent,
            metadata: {
                ...message.metadata,
                taskId,
            },
        };

        const shouldUpdate = updatedContent !== message.content || message.metadata?.taskId !== taskId;
        if (shouldUpdate && onMessageUpdate) {
            try {
                await onMessageUpdate(updatedMessage);
            } catch (error) {
                console.error('Failed to update message for task link:', error);
            }
        }

        // 发送通知
        const notification: TeamMessage = {
            id: `msg-link-${randomUUID()}`,
            teamId,
            fromDisplayName: actorName,
            content: `关联了消息到任务：**${task.title}**`,
            type: 'notification',
            timestamp: Date.now(),
            shortContent: `消息已关联到任务`,
        };

        await onMessageSend?.(notification);
    }, [messages, tasks, teamId, onMessageSend, onMessageUpdate]);

    /**
     * 检查消息是否应该创建任务
     */
    const shouldCreateTaskFromMessage = useCallback((message: string): boolean => {
        const keywords = ['创建任务', '新建任务', 'add task', 'create task', 'todo:', '任务：'];
        return keywords.some(keyword => message.toLowerCase().includes(keyword));
    }, []);

    /**
     * 获取任务统计
     */
    const getTaskStats = useCallback(() => {
        const total = tasks.length;
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};

        tasks.forEach(task => {
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;
            if (task.priority) {
                byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
            }
        });

        return {
            total,
            byStatus,
            byPriority,
            linkedTasks: taskLinks.size,
        };
    }, [tasks, taskLinks]);

    return {
        // 数据
        taskLinks,
        getTaskStats,

        // 操作
        getMessagesForTask,
        getTasksForMessage,
        getTaskById,
        updateTaskWithSync,
        createTaskFromMessage,
        createTaskDirect,
        linkMessageToTask,
        shouldCreateTaskFromMessage,
        extractTaskIds,
    };
}
