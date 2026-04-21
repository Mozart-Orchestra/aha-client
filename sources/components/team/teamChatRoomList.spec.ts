import { describe, expect, it } from 'vitest';

import type { TeamMessage } from '@/sync/teamMessageTypes';
import {
    appendTeamMessage,
    dedupeAndSortTeamMessages,
    isNearBottom,
    mergeTeamMessages,
    shouldLoadOlderMessages,
    shouldShowScrollToLatestButton,
} from './teamChatRoomList';

function makeMessage(id: string, timestamp: number, content = id): TeamMessage {
    return {
        id,
        teamId: 'team-1',
        type: 'chat',
        content,
        timestamp,
        fromDisplayName: 'User',
    };
}

describe('teamChatRoomList helpers', () => {
    it('dedupeAndSortTeamMessages keeps the newest payload per id and sorts chronologically', () => {
        const result = dedupeAndSortTeamMessages([
            makeMessage('b', 3000, 'late'),
            makeMessage('a', 1000, 'first'),
            makeMessage('b', 2000, 'replacement'),
        ]);

        expect(result).toEqual([
            makeMessage('a', 1000, 'first'),
            makeMessage('b', 2000, 'replacement'),
        ]);
    });

    it('mergeTeamMessages deduplicates incoming messages and trims to the latest 500 by default', () => {
        const previous = Array.from({ length: 500 }, (_, index) =>
            makeMessage(`msg-${index}`, index)
        );
        const result = mergeTeamMessages(previous, [
            makeMessage('msg-250', 9999, 'updated duplicate'),
            makeMessage('msg-500', 500),
        ]);

        expect(result).toHaveLength(500);
        expect(result[0].id).toBe('msg-1');
        expect(result.at(-1)).toEqual(makeMessage('msg-250', 9999, 'updated duplicate'));
    });

    it('appendTeamMessage preserves ordering and deduplicates by id', () => {
        const result = appendTeamMessage(
            [
                makeMessage('msg-1', 1000),
                makeMessage('msg-2', 3000),
            ],
            makeMessage('msg-2', 2000, 'replacement')
        );

        expect(result).toEqual([
            makeMessage('msg-1', 1000),
            makeMessage('msg-2', 2000, 'replacement'),
        ]);
    });

    it('mergeTeamMessages can keep full history when limit is disabled', () => {
        const previous = Array.from({ length: 500 }, (_, index) =>
            makeMessage(`msg-${index}`, index)
        );
        const result = mergeTeamMessages(previous, [makeMessage('older', -1)], null);

        expect(result).toHaveLength(501);
        expect(result[0]).toEqual(makeMessage('older', -1));
    });

    it('isNearBottom treats inverted FlatList offset near zero as "at bottom"', () => {
        expect(isNearBottom(0)).toBe(true);
        expect(isNearBottom(80)).toBe(true);
        expect(isNearBottom(150)).toBe(false);
    });

    it('shows scroll-to-latest button when messages exist and user is away from bottom', () => {
        expect(shouldShowScrollToLatestButton({
            messageCount: 12,
            offsetY: 400,
        })).toBe(true);
    });

    it('hides scroll-to-latest button when there are no messages', () => {
        expect(shouldShowScrollToLatestButton({
            messageCount: 0,
            offsetY: 500,
        })).toBe(false);
    });

    it('hides scroll-to-latest button when user is already at the bottom', () => {
        expect(shouldShowScrollToLatestButton({
            messageCount: 12,
            offsetY: 20,
        })).toBe(false);
    });

    it('loads older messages when user scrolls near the history start', () => {
        expect(shouldLoadOlderMessages({
            hasMore: true,
            isLoading: false,
            offsetY: 820,
            contentHeight: 1200,
            viewportHeight: 300,
        })).toBe(true);
    });

    it('loads older messages when the current page does not fill the viewport', () => {
        expect(shouldLoadOlderMessages({
            hasMore: true,
            isLoading: false,
            offsetY: 0,
            contentHeight: 180,
            viewportHeight: 300,
        })).toBe(true);
    });

    it('does not load older messages while a request is already running', () => {
        expect(shouldLoadOlderMessages({
            hasMore: true,
            isLoading: true,
            offsetY: 820,
            contentHeight: 1200,
            viewportHeight: 300,
        })).toBe(false);
    });
});
