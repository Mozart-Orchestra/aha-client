import { describe, expect, it } from 'vitest';

import { resolveWebInvertedListAnchorAdjustment } from './invertedListAnchor';

describe('resolveWebInvertedListAnchorAdjustment', () => {
    it('does nothing when content height does not grow', () => {
        expect(resolveWebInvertedListAnchorAdjustment({
            previousContentHeight: 500,
            previousOffsetY: 120,
            wasNearBottom: false,
        }, 500)).toEqual({ type: 'none' });
    });

    it('scrolls to latest when user was already near the bottom', () => {
        expect(resolveWebInvertedListAnchorAdjustment({
            previousContentHeight: 500,
            previousOffsetY: 20,
            wasNearBottom: true,
        }, 560)).toEqual({ type: 'scroll_to_latest' });
    });

    it('preserves offset when user was reading older content', () => {
        expect(resolveWebInvertedListAnchorAdjustment({
            previousContentHeight: 500,
            previousOffsetY: 240,
            wasNearBottom: false,
        }, 560)).toEqual({
            type: 'preserve_offset',
            offset: 300,
        });
    });
});
