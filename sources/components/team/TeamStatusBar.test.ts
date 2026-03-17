import { describe, expect, it } from 'vitest';

import { countSignals, selectSignalsForDisplay } from './teamStatusSignals';

describe('TeamStatusBar countSignals', () => {
    it('treats in-progress tasks as running even when execution links are transiently missing', () => {
        const counts = countSignals([
            {
                id: 'task-1',
                title: 'Running task',
                status: 'in-progress',
                updatedAt: 1,
                createdAt: 1,
                assigneeId: 'session-1',
            } as any,
        ]);

        expect(counts.running).toBe(1);
    });

    it('does not double-count a task that is both in-progress and has an active execution link', () => {
        const counts = countSignals([
            {
                id: 'task-1',
                title: 'Running task',
                status: 'in_progress',
                updatedAt: 1,
                createdAt: 1,
                assigneeId: 'session-1',
                executionLinks: [
                    {
                        sessionId: 'session-1',
                        status: 'active',
                    },
                ],
            } as any,
        ]);

        expect(counts.running).toBe(1);
    });

    it('keeps the status row mounted by returning all signals when counts are transiently zero', () => {
        const result = selectSignalsForDisplay([
            { key: 'running', count: 0 },
            { key: 'deciding', count: 0 },
            { key: 'blocked', count: 0 },
        ]);

        expect(result.hasActivity).toBe(false);
        expect(result.signals).toHaveLength(3);
    });
});
