export type WebInvertedListAnchorSnapshot = {
    previousContentHeight: number;
    previousOffsetY: number;
    wasNearBottom: boolean;
};

export type WebInvertedListAnchorAdjustment =
    | { type: 'none' }
    | { type: 'scroll_to_latest' }
    | { type: 'preserve_offset'; offset: number };

export function resolveWebInvertedListAnchorAdjustment(
    snapshot: WebInvertedListAnchorSnapshot,
    nextContentHeight: number
): WebInvertedListAnchorAdjustment {
    const delta = nextContentHeight - snapshot.previousContentHeight;
    if (delta <= 0) {
        return { type: 'none' };
    }

    if (snapshot.wasNearBottom) {
        return { type: 'scroll_to_latest' };
    }

    return {
        type: 'preserve_offset',
        offset: snapshot.previousOffsetY + delta,
    };
}
