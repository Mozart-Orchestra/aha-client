import * as React from 'react';
import { TokenStorage } from '@/auth/tokenStorage';
import type { KanbanTask } from '@/sync/kanbanTypes';
import {
    createTeamTask,
    deleteTeamTask,
    listTeamTasks,
    refineTeamTask,
    rewriteTeamTask,
    updateTeamTask,
    type CreateTeamTaskInput,
    type RefineTaskResponse,
    type RewriteTaskResponse,
    type TaskRewriteStyle,
    type UpdateTeamTaskInput,
} from '@/sync/apiTasks';

type TaskSource = 'canonical' | 'unavailable';

interface UseTeamTasksResult {
    tasks: KanbanTask[];
    version: number;
    isLoading: boolean;
    error: string | null;
    source: TaskSource;
    refresh: () => Promise<void>;
    createTask: (input: CreateTeamTaskInput) => Promise<KanbanTask>;
    updateTask: (taskId: string, updates: UpdateTeamTaskInput) => Promise<KanbanTask>;
    deleteTask: (taskId: string) => Promise<void>;
    refineTask: (taskId: string, context?: string) => Promise<RefineTaskResponse>;
    rewriteTask: (taskId: string, style?: TaskRewriteStyle) => Promise<RewriteTaskResponse>;
}

async function requireCredentials() {
    const credentials = await TokenStorage.getCredentials();
    if (!credentials) {
        throw new Error('Not authenticated');
    }
    return credentials;
}

function upsertTask(tasks: KanbanTask[], nextTask: KanbanTask): KanbanTask[] {
    const index = tasks.findIndex((task) => task.id === nextTask.id);
    if (index === -1) {
        return [nextTask, ...tasks];
    }
    return tasks.map((task) => (task.id === nextTask.id ? nextTask : task));
}

export function useTeamTasks(teamId: string | null | undefined): UseTeamTasksResult {
    const [tasks, setTasks] = React.useState<KanbanTask[]>([]);
    const [version, setVersion] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [source, setSource] = React.useState<TaskSource>('unavailable');

    const refresh = React.useCallback(async () => {
        if (!teamId) {
            setTasks([]);
            setVersion(0);
            setError(null);
            setSource('unavailable');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const credentials = await requireCredentials();
            const result = await listTeamTasks(credentials, teamId);
            setTasks(result.tasks);
            setVersion(result.version);
            setSource('canonical');
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load tasks');
            setSource('unavailable');
        } finally {
            setIsLoading(false);
        }
    }, [teamId]);

    React.useEffect(() => {
        refresh().catch(() => undefined);
    }, [refresh]);

    const createTaskMutation = React.useCallback(async (input: CreateTeamTaskInput) => {
        if (!teamId) {
            throw new Error('Missing team id');
        }

        const credentials = await requireCredentials();
        const task = await createTeamTask(credentials, teamId, input);
        setTasks((current) => upsertTask(current, task));
        setVersion((current) => current + 1);
        setError(null);
        setSource('canonical');
        return task;
    }, [teamId]);

    const updateTaskMutation = React.useCallback(async (taskId: string, updates: UpdateTeamTaskInput) => {
        if (!teamId) {
            throw new Error('Missing team id');
        }

        const credentials = await requireCredentials();
        const task = await updateTeamTask(credentials, teamId, taskId, updates);
        setTasks((current) => upsertTask(current, task));
        setVersion((current) => current + 1);
        setError(null);
        setSource('canonical');
        return task;
    }, [teamId]);

    const deleteTaskMutation = React.useCallback(async (taskId: string) => {
        if (!teamId) {
            throw new Error('Missing team id');
        }

        const credentials = await requireCredentials();
        await deleteTeamTask(credentials, teamId, taskId);
        setTasks((current) => current.filter((task) => task.id !== taskId));
        setVersion((current) => current + 1);
        setError(null);
        setSource('canonical');
    }, [teamId]);

    const refineTaskMutation = React.useCallback(async (taskId: string, context?: string) => {
        if (!teamId) {
            throw new Error('Missing team id');
        }

        const credentials = await requireCredentials();
        const result = await refineTeamTask(credentials, teamId, taskId, context);
        setTasks((current) => upsertTask(current, result.task));
        setVersion((current) => current + 1);
        setError(null);
        setSource('canonical');
        return result;
    }, [teamId]);

    const rewriteTaskMutation = React.useCallback(async (taskId: string, style?: TaskRewriteStyle) => {
        if (!teamId) {
            throw new Error('Missing team id');
        }

        const credentials = await requireCredentials();
        const result = await rewriteTeamTask(credentials, teamId, taskId, style);
        setTasks((current) => upsertTask(current, result.task));
        setVersion((current) => current + 1);
        setError(null);
        setSource('canonical');
        return result;
    }, [teamId]);

    return {
        tasks,
        version,
        isLoading,
        error,
        source,
        refresh,
        createTask: createTaskMutation,
        updateTask: updateTaskMutation,
        deleteTask: deleteTaskMutation,
        refineTask: refineTaskMutation,
        rewriteTask: rewriteTaskMutation,
    };
}
