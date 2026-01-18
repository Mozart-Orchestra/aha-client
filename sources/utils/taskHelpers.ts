/**
 * Task Helper Functions
 *
 * Utility functions for Kanban task management, including:
 * - Task creation from chat commands
 * - Task status change notifications
 * - Task mention parsing
 * - Task dependency management
 */

import { KanbanTask, KanbanBoard } from '@/sync/kanbanTypes';
import { randomUUID } from 'expo-crypto';

/**
 * Parse task creation command from chat message
 * Format:
 * /task [title]
 * #desc [description]
 * #assign [@member]
 * #priority [low|medium|high|urgent]
 * #due [YYYY-MM-DD]
 * #tags [tag1,tag2]
 */
export interface ParsedTaskCommand {
    task: Partial<KanbanTask>;
    description: string;
    assigneeDisplayName?: string;
}

export function parseTaskCommand(content: string): ParsedTaskCommand | null {
    const lines = content.split('\n');
    const commandRegex = /\/task\s+(.+)/;
    const firstLine = lines[0];

    const commandMatch = firstLine.match(commandRegex);
    if (!commandMatch) return null;

    const task: Partial<KanbanTask> = {
        title: commandMatch[1].trim(),
        source: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'todo',
        priority: 'medium'
    };

    let description = '';

    // Parse optional flags
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#desc ')) {
            description = line.slice(6).trim();
            task.description = description;
        } else if (line.startsWith('#assign ')) {
            const assignee = line.slice(8).trim();
            task.assigneeId = assignee.replace('@', '');
        } else if (line.startsWith('#priority ')) {
            const priority = line.slice(10).trim();
            if (['low', 'medium', 'high', 'urgent'].includes(priority)) {
                task.priority = priority as any;
            }
        } else if (line.startsWith('#due ')) {
            const dueDate = line.slice(5).trim();
            task.dueDate = new Date(dueDate).getTime();
        } else if (line.startsWith('#tags ')) {
            const tags = line.slice(6).trim();
            task.tags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
    }

    return { task, description };
}

/**
 * Create a new task from parsed command
 */
export function createTaskFromCommand(
    parsed: ParsedTaskCommand,
    messageId: string,
    reporterId: string
): KanbanTask {
    return {
        id: Math.random().toString(36).substr(2, 9),
        title: parsed.task.title!,
        description: parsed.task.description,
        status: parsed.task.status || 'todo',
        assigneeId: parsed.task.assigneeId,
        reporterId,
        priority: parsed.task.priority,
        dueDate: parsed.task.dueDate,
        tags: parsed.task.tags,
        source: parsed.task.source,
        sourceMessageId: messageId,
        createdAt: parsed.task.createdAt!,
        updatedAt: parsed.task.updatedAt!,
        relatedMessageIds: [messageId],
        approvalStatus: 'approved' // User-created tasks are auto-approved
    };
}

/**
 * Check if a task is blocked by dependencies
 */
export function isTaskBlocked(task: KanbanTask, allTasks: KanbanTask[]): boolean {
    if (!task.dependencies || task.dependencies.length === 0) return false;

    return task.dependencies.some(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        return !depTask || depTask.status !== 'done';
    });
}

/**
 * Get tasks that are blocking this task
 */
export function getBlockingTasks(task: KanbanTask, allTasks: KanbanTask[]): KanbanTask[] {
    if (!task.dependencies) return [];
    return task.dependencies
        .map(depId => allTasks.find(t => t.id === depId))
        .filter((t): t is KanbanTask => t !== undefined && t.status !== 'done');
}

/**
 * Get tasks that are blocked by this task
 */
export function getBlockedTasks(task: KanbanTask, allTasks: KanbanTask[]): KanbanTask[] {
    return allTasks.filter(t =>
        t.dependencies?.includes(task.id) && t.status !== 'done'
    );
}

/**
 * Parse task mentions from message content
 * Matches #task-abc or #[task title]
 */
export interface TaskMention {
    text: string;
    taskId?: string;
}

export function parseTaskMentions(content: string, tasks: KanbanTask[]): TaskMention[] {
    const taskMentionRegex = /#(?:task-([\w-]+)|\[([^\]]+)\])/g;
    const matches = [...content.matchAll(taskMentionRegex)];

    const parts: TaskMention[] = [];
    let lastIndex = 0;

    matches.forEach(match => {
        const taskId = match[1];
        const taskTitle = match[2];

        // Find task
        const task = taskId
            ? tasks.find(t => t.id === taskId)
            : tasks.find(t => t.title.toLowerCase() === taskTitle?.toLowerCase());

        if (task) {
            // Add preceding text
            if (match.index! > lastIndex) {
                parts.push({ text: content.slice(lastIndex, match.index) });
            }
            // Add task link
            parts.push({ text: `#${task.title}`, taskId: task.id });
            lastIndex = match.index! + match[0].length;
        }
    });

    // Add remaining text
    if (lastIndex < content.length) {
        parts.push({ text: content.slice(lastIndex) });
    }

    return parts;
}

/**
 * Get next status in workflow
 */
export function getNextStatus(currentStatus: string): string {
    const statusFlow: Record<string, string> = {
        'todo': 'in-progress',
        'in-progress': 'review',
        'review': 'done',
        'done': 'done',
        'blocked': 'todo'
    };
    return statusFlow[currentStatus] || currentStatus;
}

/**
 * Check if task needs approval
 */
export function taskNeedsApproval(task: KanbanTask): boolean {
    return task.source === 'ai' && task.approvalStatus === 'pending';
}

/**
 * Approve a task
 */
export function approveTask(task: KanbanTask, approverId: string): KanbanTask {
    return {
        ...task,
        approvalStatus: 'approved',
        approvedBy: [...(task.approvedBy || []), approverId],
        updatedAt: Date.now()
    };
}

/**
 * Reject a task
 */
export function rejectTask(task: KanbanTask, rejecterId: string, reason: string): KanbanTask {
    return {
        ...task,
        approvalStatus: 'rejected',
        rejectionReason: reason,
        rejectedBy: [...(task.rejectedBy || []), rejecterId],
        updatedAt: Date.now()
    };
}

/**
 * Check if task can be started (not blocked and approved)
 */
export function canStartTask(task: KanbanTask, allTasks: KanbanTask[]): boolean {
    if (taskNeedsApproval(task)) return false;
    if (isTaskBlocked(task, allTasks)) return false;
    return true;
}
