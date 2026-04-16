import type { KanbanBoard, KanbanTask } from '@/sync/kanbanTypes';
import { storage } from '@/sync/storage';
import { NonRetryableError } from '@/utils/time';
import type { TeamTaskCreateRequest } from './apiTasks';

export type TaskWriteFallbackReason =
    | 'unsupported_field'
    | 'schema_mismatch'
    | 'auth_failure'
    | 'server_timeout_or_5xx'
    | 'refresh_failed_after_server_write';

export interface CreateTaskWriteResult {
    task: KanbanTask;
    writePath: 'server' | 'legacy';
    fallbackReason?: TaskWriteFallbackReason;
    ambiguousOutcomeRecovered?: boolean;
    localPatchApplied?: boolean;
}

export interface CreateTaskGatewayDeps {
    teamId: string;
    createTaskOnServer: (request: TeamTaskCreateRequest) => Promise<KanbanTask>;
    legacyCreateTask: (task: Partial<KanbanTask>, reason?: TaskWriteFallbackReason) => Promise<KanbanTask>;
    refreshTeamArtifact: () => Promise<void>;
}

export class AmbiguousTaskWriteError extends Error {
    constructor(
        message: string,
        public readonly reason: 'server_timeout_or_5xx' | 'refresh_failed_after_server_write',
    ) {
        super(message);
        this.name = 'AmbiguousTaskWriteError';
    }
}

const SAFE_IGNORED_CREATE_FIELDS = new Set<keyof KanbanTask>([
    'createdAt',
    'updatedAt',
    'source',
]);

const SERVER_SUPPORTED_CREATE_FIELDS = new Set<keyof KanbanTask>([
    'title',
    'description',
    'status',
    'priority',
    'assigneeId',
    'reporterId',
    'parentTaskId',
    'approvalStatus',
]);

function getTeamBoard(teamId: string): { artifactId: string; artifact: any; board: KanbanBoard } | null {
    const artifact = storage.getState().artifacts[teamId];
    if (!artifact?.body) {
        return null;
    }

    try {
        const board = JSON.parse(artifact.body) as KanbanBoard;
        if (!board || typeof board !== 'object' || !Array.isArray(board.tasks)) {
            return null;
        }
        return { artifactId: teamId, artifact, board };
    } catch {
        return null;
    }
}

function mergeTaskIntoLocalBoard(teamId: string, task: KanbanTask): boolean {
    const current = getTeamBoard(teamId);
    if (!current) {
        return false;
    }

    if (current.board.tasks.some((entry) => entry.id === task.id)) {
        return true;
    }

    const nextBoard: KanbanBoard = {
        ...current.board,
        tasks: [...current.board.tasks, task],
    };

    storage.getState().updateArtifact({
        ...current.artifact,
        body: JSON.stringify(nextBoard, null, 2),
        updatedAt: Date.now(),
    });

    return true;
}

function snapshotTaskIds(teamId: string): Set<string> {
    const current = getTeamBoard(teamId);
    return new Set(current?.board.tasks.map((task) => task.id) ?? []);
}

function findCreatedTaskAfterRefresh(
    teamId: string,
    beforeTaskIds: Set<string>,
    request: TeamTaskCreateRequest,
): KanbanTask | null {
    const current = getTeamBoard(teamId);
    if (!current) {
        return null;
    }

    const title = request.title.trim();
    const description = request.description?.trim() || '';

    const exactNewTask = current.board.tasks.find((task) =>
        !beforeTaskIds.has(task.id)
        && task.title.trim() === title
        && (task.description?.trim() || '') === description
        && (request.priority ? task.priority === request.priority : true)
        && (request.assigneeId !== undefined ? (task.assigneeId ?? null) === request.assigneeId : true),
    );

    if (exactNewTask) {
        return exactNewTask;
    }

    return current.board.tasks.find((task) =>
        task.title.trim() === title
        && (task.description?.trim() || '') === description
        && (request.priority ? task.priority === request.priority : true)
        && (request.assigneeId !== undefined ? (task.assigneeId ?? null) === request.assigneeId : true),
    ) ?? null;
}

function getUnsupportedCreateFields(taskData: Partial<KanbanTask>): string[] {
    const unsupported = new Set<string>();

    for (const [key, value] of Object.entries(taskData) as Array<[keyof KanbanTask, unknown]>) {
        if (value === undefined) {
            continue;
        }

        if (SERVER_SUPPORTED_CREATE_FIELDS.has(key) || SAFE_IGNORED_CREATE_FIELDS.has(key)) {
            continue;
        }

        unsupported.add(String(key));
    }

    if (taskData.source && taskData.source !== 'user') {
        unsupported.add('source');
    }

    return [...unsupported];
}

function buildServerCreateRequest(taskData: Partial<KanbanTask>): TeamTaskCreateRequest {
    return {
        title: taskData.title?.trim() || 'Untitled Task',
        ...(taskData.description?.trim() ? { description: taskData.description.trim() } : {}),
        ...(taskData.status ? { status: taskData.status } : {}),
        ...(taskData.priority ? { priority: taskData.priority } : {}),
        ...(taskData.assigneeId !== undefined ? { assigneeId: taskData.assigneeId ?? null } : {}),
        ...(taskData.reporterId ? { reporterId: taskData.reporterId } : {}),
        ...(taskData.parentTaskId !== undefined ? { parentTaskId: taskData.parentTaskId ?? null } : {}),
        ...(taskData.approvalStatus ? { approvalStatus: taskData.approvalStatus } : {}),
    };
}

function classifyCreateError(error: unknown): Exclude<TaskWriteFallbackReason, 'unsupported_field' | 'refresh_failed_after_server_write'> {
    if (error instanceof NonRetryableError) {
        const message = error.message.toLowerCase();
        if (message.includes('unauthorized') || message.includes('auth')) {
            return 'auth_failure';
        }
        return 'schema_mismatch';
    }

    return 'server_timeout_or_5xx';
}

export async function createTaskServerFirstWithFallback(
    deps: CreateTaskGatewayDeps,
    taskData: Partial<KanbanTask>,
): Promise<CreateTaskWriteResult> {
    const unsupportedFields = getUnsupportedCreateFields(taskData);
    if (unsupportedFields.length > 0) {
        const task = await deps.legacyCreateTask(taskData, 'unsupported_field');
        return {
            task,
            writePath: 'legacy',
            fallbackReason: 'unsupported_field',
        };
    }

    const request = buildServerCreateRequest(taskData);
    const beforeTaskIds = snapshotTaskIds(deps.teamId);

    try {
        const createdTask = await deps.createTaskOnServer(request);

        try {
            await deps.refreshTeamArtifact();
            const refreshedTask = findCreatedTaskAfterRefresh(deps.teamId, beforeTaskIds, request);
            if (!refreshedTask) {
                const localPatchApplied = mergeTaskIntoLocalBoard(deps.teamId, createdTask);
                return {
                    task: createdTask,
                    writePath: 'server',
                    localPatchApplied,
                };
            }
            return {
                task: refreshedTask,
                writePath: 'server',
            };
        } catch {
            const localPatchApplied = mergeTaskIntoLocalBoard(deps.teamId, createdTask);
            return {
                task: createdTask,
                writePath: 'server',
                fallbackReason: 'refresh_failed_after_server_write',
                localPatchApplied,
            };
        }
    } catch (error) {
        const fallbackReason = classifyCreateError(error);

        if (fallbackReason === 'server_timeout_or_5xx') {
            try {
                await deps.refreshTeamArtifact();
                const recoveredTask = findCreatedTaskAfterRefresh(deps.teamId, beforeTaskIds, request);
                if (recoveredTask) {
                    return {
                        task: recoveredTask,
                        writePath: 'server',
                        fallbackReason,
                        ambiguousOutcomeRecovered: true,
                    };
                }
            } catch {
                throw new AmbiguousTaskWriteError(
                    'Task create outcome is ambiguous after server error and refresh failure. Please retry after sync recovers.',
                    'server_timeout_or_5xx',
                );
            }
        }

        if (fallbackReason === 'server_timeout_or_5xx') {
            const task = await deps.legacyCreateTask(taskData, fallbackReason);
            return {
                task,
                writePath: 'legacy',
                fallbackReason,
            };
        }

        const task = await deps.legacyCreateTask(taskData, fallbackReason);
        return {
            task,
            writePath: 'legacy',
            fallbackReason,
        };
    }
}
