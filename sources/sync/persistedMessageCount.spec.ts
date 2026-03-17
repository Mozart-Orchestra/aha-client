import { describe, expect, it } from 'vitest';

import { getNextPersistedMessageCount } from './persistedMessageCount';

describe('getNextPersistedMessageCount', () => {
    it('does not increment when the realtime message was already received', () => {
        expect(getNextPersistedMessageCount({
            currentPersistedCount: 12,
            currentLoadedCount: 11,
            alreadyReceived: true,
        })).toBeNull();
    });

    it('increments from the larger of persisted and loaded counts', () => {
        expect(getNextPersistedMessageCount({
            currentPersistedCount: 12,
            currentLoadedCount: 11,
            alreadyReceived: false,
        })).toBe(13);

        expect(getNextPersistedMessageCount({
            currentPersistedCount: 12,
            currentLoadedCount: 14,
            alreadyReceived: false,
        })).toBe(15);
    });

    it('handles an initial session with undefined persisted count and zero loaded messages', () => {
        expect(getNextPersistedMessageCount({
            currentPersistedCount: undefined,
            currentLoadedCount: 0,
            alreadyReceived: false,
        })).toBe(1);
    });

    it('handles an initial session with undefined persisted count and existing loaded messages', () => {
        expect(getNextPersistedMessageCount({
            currentPersistedCount: undefined,
            currentLoadedCount: 7,
            alreadyReceived: false,
        })).toBe(8);
    });
});
