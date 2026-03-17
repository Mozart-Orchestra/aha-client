import { describe, expect, it } from 'vitest';

import type { KanbanTask } from '@/sync/kanbanTypes';

import { getActiveTaskForSession } from './teamActiveTask';

describe('getActiveTaskForSession', () => {
    const baseTask: KanbanTask = {
        id: 'task-1',
        title: 'Default task',
        status: 'todo',
        createdAt: 1,
        updatedAt: 1,
    };

    it('prefers an active primary execution link for the session', () => {
        const tasks: KanbanTask[] = [
            {
                ...baseTask,
                id: 'task-a',
                title: 'Prepare truth layer rollout',
                status: 'in-progress',
                updatedAt: 500,
                executionLinks: [
                    { sessionId: 'agent-1', linkedAt: 1000, role: 'primary', status: 'active' },
                ],
            },
            {
                ...baseTask,
                id: 'task-b',
                title: 'Older supporting task',
                status: 'in-progress',
                updatedAt: 800,
                executionLinks: [
                    { sessionId: 'agent-1', linkedAt: 1200, role: 'supporting', status: 'active' },
                ],
            },
        ];

        expect(getActiveTaskForSession(tasks, 'agent-1')).toEqual({
            taskId: 'task-a',
            title: 'Prepare truth layer rollout',
            startedAt: 1000,
        });
    });

    it('falls back to assigned in-progress task when no active execution link exists', () => {
        const tasks: KanbanTask[] = [
            {
                ...baseTask,
                id: 'task-c',
                title: 'Implement board control plane',
                status: 'in_progress',
                assigneeId: 'agent-2',
                updatedAt: 2200,
            },
            {
                ...baseTask,
                id: 'task-d',
                title: 'Old completed task',
                status: 'done',
                assigneeId: 'agent-2',
                updatedAt: 9999,
            },
        ];

        expect(getActiveTaskForSession(tasks, 'agent-2')).toEqual({
            taskId: 'task-c',
            title: 'Implement board control plane',
            startedAt: 2200,
        });
    });

    it('returns null when the session has no active or in-progress task', () => {
        const tasks: KanbanTask[] = [
            {
                ...baseTask,
                id: 'task-e',
                title: 'Blocked task',
                status: 'blocked',
                assigneeId: 'agent-3',
                updatedAt: 3000,
            },
        ];

        expect(getActiveTaskForSession(tasks, 'agent-3')).toBeNull();
    });
});
