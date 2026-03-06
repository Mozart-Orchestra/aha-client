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
                { id: 't1', title: 'Task 1', status: 'in_progress', assigneeId: 'builder', updatedAt: 100 },
                { title: '', status: 'DONE', updatedAt: 200 },
            ],
        });

        const parsed = parseBoardTasksFromBody(body);
        expect(parsed.tasks).toHaveLength(2);
        expect(parsed.tasks[0].status).toBe('in-progress');
        expect(parsed.tasks[0].assigneeId).toBe('builder');
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
                status: 'todo',
                assigneeId: null,
                createdAt: 10,
                updatedAt: 20,
            }],
            'Ops Team'
        );

        expect(Array.isArray(nextRoot.tasks)).toBe(true);
        expect((nextRoot.tasks as any[])[0].status).toBe('todo');
        expect((nextRoot.team as { name: string }).name).toBe('Ops Team');
    });
});
