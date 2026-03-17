import { describe, expect, it } from 'vitest';
import { createTaskMetadata, normalizeTaskPriorityForTeamMessage } from './taskChatSync';

describe('normalizeTaskPriorityForTeamMessage', () => {
    it('maps medium to normal for team message metadata', () => {
        expect(normalizeTaskPriorityForTeamMessage('medium')).toBe('normal');
    });

    it('keeps server-supported priorities unchanged', () => {
        expect(normalizeTaskPriorityForTeamMessage('low')).toBe('low');
        expect(normalizeTaskPriorityForTeamMessage('normal')).toBe('normal');
        expect(normalizeTaskPriorityForTeamMessage('high')).toBe('high');
        expect(normalizeTaskPriorityForTeamMessage('urgent')).toBe('urgent');
    });

    it('drops unsupported priority values', () => {
        expect(normalizeTaskPriorityForTeamMessage('unknown')).toBeUndefined();
        expect(normalizeTaskPriorityForTeamMessage()).toBeUndefined();
    });
});

describe('createTaskMetadata', () => {
    it('overrides medium detail priority with normal in returned metadata', () => {
        const metadata = createTaskMetadata('task-1', 'created', {
            priority: 'medium',
            status: 'todo',
        });

        expect(metadata).toMatchObject({
            taskId: 'task-1',
            priority: 'normal',
            status: 'todo',
            _action: 'created',
        });
    });
});
