import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthCredentials } from '@/auth/tokenStorage';
import {
    createTeamTask,
    listTeamTasks,
    rewriteTeamTask,
    updateTeamTask,
} from './apiTasks';

vi.mock('./serverConfig', () => ({
    getServerUrl: () => 'https://api.test.com',
}));

vi.mock('@/utils/time', () => ({
    backoff: vi.fn((fn) => fn()),
}));

describe('apiTasks', () => {
    const credentials: AuthCredentials = {
        token: 'test-token',
        secret: 'test-secret',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('lists canonical team tasks', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                tasks: [{ id: 'task-1', title: 'Board', status: 'todo', createdAt: 1, updatedAt: 2 }],
                version: 3,
            }),
        });

        await expect(listTeamTasks(credentials, 'team-1')).resolves.toEqual({
            tasks: [{ id: 'task-1', title: 'Board', status: 'todo', createdAt: 1, updatedAt: 2 }],
            version: 3,
        });

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.test.com/v1/teams/team-1/tasks',
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('persists dueDate and dependencies on create/update', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    task: {
                        id: 'task-1',
                        title: 'Ship gantt',
                        status: 'todo',
                        createdAt: 1,
                        updatedAt: 2,
                        dueDate: 10,
                        dependencies: ['task-0'],
                    },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    task: {
                        id: 'task-1',
                        title: 'Ship gantt',
                        status: 'review',
                        createdAt: 1,
                        updatedAt: 3,
                        dueDate: null,
                        dependencies: [],
                    },
                }),
            });

        await expect(createTeamTask(credentials, 'team-1', {
            title: 'Ship gantt',
            dueDate: 10,
            dependencies: ['task-0'],
        })).resolves.toEqual(expect.objectContaining({
            dueDate: 10,
            dependencies: ['task-0'],
        }));

        await expect(updateTeamTask(credentials, 'team-1', 'task-1', {
            dueDate: null,
            dependencies: [],
            status: 'review',
        })).resolves.toEqual(expect.objectContaining({
            dueDate: null,
            dependencies: [],
            status: 'review',
        }));

        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            'https://api.test.com/v1/teams/team-1/tasks',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ title: 'Ship gantt', dueDate: 10, dependencies: ['task-0'] }),
            })
        );
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            'https://api.test.com/v1/teams/team-1/tasks/task-1',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ dueDate: null, dependencies: [], status: 'review' }),
            })
        );
    });

    it('surfaces rewrite API failures', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: vi.fn().mockResolvedValue({ error: 'rewrite exploded' }),
        });

        await expect(rewriteTeamTask(credentials, 'team-1', 'task-9')).rejects.toThrow('rewrite exploded');
    });
});
