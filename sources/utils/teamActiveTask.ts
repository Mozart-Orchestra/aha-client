import type { KanbanTask, TaskExecutionLink } from '@/sync/kanbanTypes';

export interface ActiveTaskSummary {
    taskId: string;
    title: string;
    startedAt: number;
}

function normalizeTaskStatus(status: string): string {
    const normalized = status ? status.toLowerCase() : 'todo';
    if (normalized === 'in_progress' || normalized === 'inprogress') {
        return 'in-progress';
    }
    return normalized;
}

function compareExecutionLinks(a: { task: KanbanTask; link: TaskExecutionLink }, b: { task: KanbanTask; link: TaskExecutionLink }): number {
    if (a.link.role !== b.link.role) {
        return a.link.role === 'primary' ? -1 : 1;
    }

    return b.link.linkedAt - a.link.linkedAt;
}

export function getActiveTaskForSession(tasks: KanbanTask[], sessionId: string): ActiveTaskSummary | null {
    const activeExecutionLinks = tasks.flatMap((task) =>
        (task.executionLinks ?? [])
            .filter((link) => link.sessionId === sessionId && link.status === 'active')
            .map((link) => ({ task, link }))
    );

    if (activeExecutionLinks.length > 0) {
        activeExecutionLinks.sort(compareExecutionLinks);
        const current = activeExecutionLinks[0];
        return {
            taskId: current.task.id,
            title: current.task.title,
            startedAt: current.link.linkedAt,
        };
    }

    const assignedInProgressTask = tasks
        .filter((task) => task.assigneeId === sessionId && normalizeTaskStatus(task.status) === 'in-progress')
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (!assignedInProgressTask) {
        return null;
    }

    return {
        taskId: assignedInProgressTask.id,
        title: assignedInProgressTask.title,
        startedAt: assignedInProgressTask.updatedAt,
    };
}
