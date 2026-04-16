import type { AuthCredentials } from '@/auth/tokenStorage';
import type { KanbanTask, TaskComment } from '@/sync/kanbanTypes';
import { checkAuth } from '@/utils/handleResponse';
import { backoff, NonRetryableError } from '@/utils/time';
import { getServerUrl } from './serverConfig';

export interface TeamTaskCreateRequest {
    title: string;
    description?: string;
    status?: string;
    priority?: KanbanTask['priority'];
    assigneeId?: string | null;
    reporterId?: string;
    parentTaskId?: string | null;
    approvalStatus?: KanbanTask['approvalStatus'];
}

export interface TeamTaskUpdateRequest {
    title?: string;
    description?: string;
    priority?: KanbanTask['priority'];
    assigneeId?: string | null;
    approvalStatus?: KanbanTask['approvalStatus'];
}

export interface TeamTaskCommentRequest {
    sessionId: string;
    role?: string;
    displayName?: string;
    type?: TaskComment['type'];
    content: string;
    fromStatus?: string;
    toStatus?: string;
    mentions?: string[];
}

async function throwTaskHttpError(response: Response, fallbackMessage: string): Promise<never> {
    let serverMessage: string | null = null;

    try {
        const body = await response.json() as { error?: unknown; message?: unknown };
        if (typeof body.error === 'string' && body.error.trim()) {
            serverMessage = body.error;
        } else if (typeof body.message === 'string' && body.message.trim()) {
            serverMessage = body.message;
        }
    } catch {
        // Ignore malformed/empty error bodies.
    }

    const message = serverMessage ?? fallbackMessage;
    const isClientError = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;

    if (isClientError) {
        throw new NonRetryableError(message);
    }

    throw new Error(message);
}

export async function createTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    request: TeamTaskCreateRequest,
): Promise<KanbanTask> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/tasks`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTaskHttpError(response, `Failed to create task: ${response.status}`);
        }

        const data = await response.json() as { success: true; task: KanbanTask };
        return data.task;
    });
}

export async function updateTeamTask(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string,
    request: TeamTaskUpdateRequest,
): Promise<KanbanTask> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTaskHttpError(response, `Failed to update task: ${response.status}`);
        }

        const data = await response.json() as { success: true; task: KanbanTask };
        return data.task;
    });
}

export async function addTeamTaskComment(
    credentials: AuthCredentials,
    teamId: string,
    taskId: string,
    request: TeamTaskCommentRequest,
): Promise<KanbanTask> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        checkAuth(response, credentials.token);

        if (!response.ok) {
            await throwTaskHttpError(response, `Failed to add task comment: ${response.status}`);
        }

        const data = await response.json() as { success: true; task: KanbanTask };
        return data.task;
    });
}
