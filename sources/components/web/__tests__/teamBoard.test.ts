import { describe, expect, it } from 'vitest';
import {
    buildBoardRootWithTasks,
    getNextBoardStatus,
    parseBoardTasksFromBody,
} from '../teamBoard';

describe('teamBoard utilities', () => {
    it('parses board tasks and normalizes status', () => {
        const body = JSON.stringify({
            team: { name: 'Alpha' },
            tasks: [
                {
                    id: 't1',
                    title: 'Task 1',
                    description: 'Wire up the real gantt',
                    status: 'in_progress',
                    assigneeId: 'builder',
                    priority: 'high',
                    updatedAt: 100,
                    dueDate: 200,
                    dependencies: ['t0'],
                },
                { title: '', status: 'DONE', updatedAt: 200 },
            ],
        });

        const parsed = parseBoardTasksFromBody(body);
        expect(parsed.tasks).toHaveLength(2);
        expect(parsed.tasks[0].status).toBe('in-progress');
        expect(parsed.tasks[0].assigneeId).toBe('builder');
        expect(parsed.tasks[0].description).toBe('Wire up the real gantt');
        expect(parsed.tasks[0].priority).toBe('high');
        expect(parsed.tasks[0].dueDate).toBe(200);
        expect(parsed.tasks[0].dependencies).toEqual(['t0']);
        expect(parsed.tasks[1].title).toBe('Untitled Task');
        expect(parsed.tasks[1].status).toBe('done');
    });

    it('returns empty fallback on invalid JSON', () => {
        const parsed = parseBoardTasksFromBody('{not-valid-json');
        expect(parsed.tasks).toEqual([]);
        expect(parsed.root).toEqual({});
    });

    it('cycles board statuses in expected order', () => {
        expect(getNextBoardStatus('todo')).toBe('in-progress');
        expect(getNextBoardStatus('in-progress')).toBe('review');
        expect(getNextBoardStatus('review')).toBe('done');
        expect(getNextBoardStatus('done')).toBe('todo');
    });

    it('builds persisted board root with fallback team object', () => {
        const root = {};
        const nextRoot = buildBoardRootWithTasks(
            root,
            [{
                id: 't1',
                title: 'Wire board',
                description: 'Keep schedule metadata intact',
                status: 'todo',
                assigneeId: null,
                priority: 'medium',
                createdAt: 10,
                updatedAt: 20,
                dueDate: 30,
                dependencies: ['task-0'],
            }],
            'Ops Team'
        );

        expect(Array.isArray(nextRoot.tasks)).toBe(true);
        expect((nextRoot.tasks as any[])[0].status).toBe('todo');
        expect((nextRoot.tasks as any[])[0].dueDate).toBe(30);
        expect((nextRoot.tasks as any[])[0].dependencies).toEqual(['task-0']);
        expect((nextRoot.team as { name: string }).name).toBe('Ops Team');
    });
});
