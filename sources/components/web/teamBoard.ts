import { normalizeTaskStatus, type TeamTaskSnapshot } from './teamOverview';

export type BoardStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type BoardTask = TeamTaskSnapshot & {
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    createdAt?: number;
    dueDate?: number | null;
    dependencies?: string[];
};

export const BOARD_STATUS_ORDER: BoardStatus[] = ['todo', 'in-progress', 'review', 'done'];

export function getNextBoardStatus(status: string): BoardStatus {
    const current = normalizeTaskStatus(status);
    const currentIndex = BOARD_STATUS_ORDER.indexOf(current);
    return BOARD_STATUS_ORDER[(currentIndex + 1) % BOARD_STATUS_ORDER.length] || 'todo';
}

export function parseBoardTasksFromBody(body: string | null | undefined): {
    root: Record<string, unknown>;
    tasks: BoardTask[];
} {
    const fallback = { root: {} as Record<string, unknown>, tasks: [] as BoardTask[] };

    if (!body) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(body);
        const root = typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
        const rawTasks = Array.isArray(root.tasks) ? root.tasks : [];

        const tasks: BoardTask[] = rawTasks
            .filter((task): task is Record<string, unknown> => typeof task === 'object' && task !== null)
            .map((task, index) => ({
                id: typeof task.id === 'string' && task.id.trim().length > 0 ? task.id : `task-${index}`,
                title: typeof task.title === 'string' && task.title.trim().length > 0 ? task.title : 'Untitled Task',
                description: typeof task.description === 'string' ? task.description : undefined,
                status: normalizeTaskStatus(task.status),
                assigneeId: typeof task.assigneeId === 'string' ? task.assigneeId : null,
                priority: typeof task.priority === 'string'
                    && ['low', 'medium', 'high', 'urgent'].includes(task.priority)
                    ? task.priority as BoardTask['priority']
                    : undefined,
                updatedAt: typeof task.updatedAt === 'number' ? task.updatedAt : Date.now(),
                createdAt: typeof task.createdAt === 'number' ? task.createdAt : undefined,
                dueDate: typeof task.dueDate === 'number' ? task.dueDate : null,
                dependencies: Array.isArray(task.dependencies)
                    ? task.dependencies.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                    : undefined,
            }));

        return { root, tasks };
    } catch {
        return fallback;
    }
}

export function buildBoardRootWithTasks(
    root: Record<string, unknown>,
    tasks: BoardTask[],
    teamName: string
): Record<string, unknown> {
    const nextRoot = { ...root };
        nextRoot.tasks = tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: normalizeTaskStatus(task.status),
            assigneeId: task.assigneeId ?? undefined,
            priority: task.priority,
            updatedAt: task.updatedAt,
            createdAt: task.createdAt ?? task.updatedAt,
            dueDate: task.dueDate ?? undefined,
            dependencies: task.dependencies?.length ? task.dependencies : undefined,
        }));

    if (!nextRoot.team || typeof nextRoot.team !== 'object') {
        nextRoot.team = {
            name: teamName,
            members: [],
        };
    }

    return nextRoot;
}
