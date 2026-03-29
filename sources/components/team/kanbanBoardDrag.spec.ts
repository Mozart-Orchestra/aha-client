import { describe, expect, it } from 'vitest';

import { normalizeKanbanStatus, resolveTaskDropStatus } from './kanbanBoardDrag';

describe('kanbanBoardDrag', () => {
    it('normalizes in-progress aliases', () => {
        expect(normalizeKanbanStatus('IN_PROGRESS')).toBe('in-progress');
        expect(normalizeKanbanStatus('in_progress')).toBe('in-progress');
    });

    it('returns null when dropping into the same status column', () => {
        expect(resolveTaskDropStatus({
            currentStatus: 'review',
            targetColumnId: 'review',
        })).toBeNull();
    });

    it('returns normalized target status for a valid cross-column drop', () => {
        expect(resolveTaskDropStatus({
            currentStatus: 'todo',
            targetColumnId: 'IN_PROGRESS',
        })).toBe('in-progress');
    });
});
