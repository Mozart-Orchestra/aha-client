import { describe, expect, it } from 'vitest';

import { resolveMatrixStreamState, resolveStickySession } from './matrixPersistence';

describe('matrixPersistence', () => {
    it('keeps the last known session when the current refresh frame temporarily loses it', () => {
        const previous = { id: 'session-1' } as any;

        expect(resolveStickySession(undefined, previous)).toBe(previous);
    });

    it('keeps last good messages visible after the stream has loaded once', () => {
        const lastGoodMessages = [{ id: 'msg-1' }] as any[];

        const state = resolveMatrixStreamState({
            isLoaded: false,
            messages: [],
            lastGoodMessages,
            hasEverLoaded: true,
        });

        expect(state.displayMessages).toEqual(lastGoodMessages);
        expect(state.showInitialLoading).toBe(false);
        expect(state.showEmptyState).toBe(false);
    });

    it('still shows initial loading before any successful load has happened', () => {
        const state = resolveMatrixStreamState({
            isLoaded: false,
            messages: [],
            lastGoodMessages: [],
            hasEverLoaded: false,
        });

        expect(state.showInitialLoading).toBe(true);
        expect(state.showEmptyState).toBe(false);
    });
});
