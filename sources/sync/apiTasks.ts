import type { AuthCredentials } from '@/auth/tokenStorage';
import type { KanbanTask } from '@/sync/kanbanTypes';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

export type TaskRewriteStyle = 'concise' | 'detailed' | 'technical' | 'user-friendly';

export interface TeamTaskListResponse {
    tasks: KanbanTask[];
    version: number;
}

export interface CreateTeamTaskInput {
    title: string;
    description?: string;
    status?: string;
    priority?: KanbanTask['priority'];
    assigneeId?: string | null;
    reporterId?: string;
    parentTaskId?: string | null;
    labels?: string[];
    dueDate?: number | null;
    dependencies?: string[];
    approvalStatus?: KanbanTask['approvalStatus'];
}

export interface UpdateTeamTaskInput {
    title?: string;
    description?: string;
    status?: string;
    priority?: KanbanTask['priority'];
    assigneeId?: string | null;
    reporterId?: string;
    parentTaskId?: string | null;
    labels?: string[];
    dueDate?: number | null;
    dependencies?: string[];
    approvalStatus?: KanbanTask['approvalStatus'];
}

export interface RefineTaskResponse {
    success: true;
    task: KanbanTask;
    refinement: {
        originalDescription: string;
        refinedDescription: string;
        suggestions: string[];
    };
}

export interface RewriteTaskResponse {
    success: true;
    task: KanbanTask;
    rewrite: {
        originalTitle: string;
        rewrittenTitle: string;
        originalDescription: string;
        rewrittenDescription: string;
    };
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<never> {
    const payload = await response.json().catch(() => ({} as { error?: string; message?: string }));
    throw new Error(payload.error || payload.message || fallbackMessage);
}

function buildHeaders(credentials: AuthCredentials): HeadersInit {
    return {
        Authorization: `Bearer ${credentials.token}`,
        'Content-Type': 'application/json',
    };
}

export async function listTeamTasks(
    credentials: AuthCredentials,
    teamId: string,
    filters?: { status?: string; assigneeId?: string }
): Promise<TeamTaskListResponse> {
    const apiEndpoint = getServerUrl();
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
    const query = params.toString();

    return await backoff(async () => {
        const response = await fetch(
            `${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks${query ? `?${query}` : ''}`,
            {
                method: 'GET',
                headers: buildHeaders(credentials),
            }
        );

        if (!response.ok) {
            await parseApiError(response, `Failed to list tasks: ${response.status}`);
        }

        return await response.json() as TeamTaskListResponse;
    });
}

export async function createTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    input: CreateTeamTaskInput
): Promise<KanbanTask> {
    const apiEndpoint = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks`, {
            method: 'POST',
            headers: buildHeaders(credentials),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            await parseApiError(response, `Failed to create task: ${response.status}`);
        }

        const payload = await response.json() as { success: true; task: KanbanTask };
        return payload.task;
    });
}

export async function updateTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string,
    updates: UpdateTeamTaskInput
): Promise<KanbanTask> {
    const apiEndpoint = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(taskId)}`,
            {
                method: 'PUT',
                headers: buildHeaders(credentials),
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) {
            await parseApiError(response, `Failed to update task: ${response.status}`);
        }

        const payload = await response.json() as { success: true; task: KanbanTask };
        return payload.task;
    });
}

export async function deleteTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string
): Promise<void> {
    const apiEndpoint = getServerUrl();

    await backoff(async () => {
        const response = await fetch(
            `${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(taskId)}`,
            {
                method: 'DELETE',
                headers: buildHeaders(credentials),
            }
        );

        if (!response.ok) {
            await parseApiError(response, `Failed to delete task: ${response.status}`);
        }
    });
}

export async function refineTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string,
    context?: string
): Promise<RefineTaskResponse> {
    const apiEndpoint = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(taskId)}/refine`,
            {
                method: 'POST',
                headers: buildHeaders(credentials),
                body: JSON.stringify({ context }),
            }
        );

        if (!response.ok) {
            await parseApiError(response, `Failed to refine task: ${response.status}`);
        }

        return await response.json() as RefineTaskResponse;
    });
}

export async function rewriteTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string,
    style: TaskRewriteStyle = 'concise'
): Promise<RewriteTaskResponse> {
    const apiEndpoint = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${apiEndpoint}/v1/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(taskId)}/rewrite`,
            {
                method: 'POST',
                headers: buildHeaders(credentials),
                body: JSON.stringify({ style }),
            }
        );

        if (!response.ok) {
            await parseApiError(response, `Failed to rewrite task: ${response.status}`);
        }

        return await response.json() as RewriteTaskResponse;
    });
}
