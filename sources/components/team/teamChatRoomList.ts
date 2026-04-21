import type { TeamMessage } from '@/sync/teamMessageTypes';

export const TEAM_CHAT_MESSAGE_LIMIT = 500;
export const TEAM_CHAT_NEAR_BOTTOM_THRESHOLD_PX = 100;
export const TEAM_CHAT_HISTORY_LOAD_THRESHOLD_PX = 160;

export function dedupeAndSortTeamMessages(messages: TeamMessage[]): TeamMessage[] {
    return Array.from(new Map(messages.map((message) => [message.id, message])).values())
        .sort((a, b) => a.timestamp - b.timestamp);
}

export function mergeTeamMessages(
    previous: TeamMessage[],
    incoming: TeamMessage[],
    limit: number | null = TEAM_CHAT_MESSAGE_LIMIT
): TeamMessage[] {
    const merged = dedupeAndSortTeamMessages([...previous, ...incoming]);
    if (typeof limit === 'number' && Number.isFinite(limit)) {
        return merged.length > limit ? merged.slice(-limit) : merged;
    }
    return merged;
}

export function appendTeamMessage(
    previous: TeamMessage[],
    message: TeamMessage,
    limit: number | null = TEAM_CHAT_MESSAGE_LIMIT
): TeamMessage[] {
    return mergeTeamMessages(previous, [message], limit);
}

// Inverted FlatList: offsetY ≈ 0 means the user is at the bottom (latest message).
// As the user scrolls back into history, offsetY grows.
export function isNearBottom(
    offsetY: number,
    threshold = TEAM_CHAT_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
    return offsetY <= threshold;
}

export function shouldShowScrollToLatestButton(args: {
    messageCount: number;
    offsetY: number;
    threshold?: number;
}): boolean {
    if (args.messageCount === 0) {
        return false;
    }
    return !isNearBottom(args.offsetY, args.threshold);
}

export function shouldLoadOlderMessages(args: {
    hasMore: boolean;
    isLoading: boolean;
    offsetY: number;
    contentHeight: number;
    viewportHeight: number;
    threshold?: number;
}): boolean {
    if (!args.hasMore || args.isLoading) {
        return false;
    }

    if (args.contentHeight <= 0 || args.viewportHeight <= 0) {
        return false;
    }

    const threshold = args.threshold ?? TEAM_CHAT_HISTORY_LOAD_THRESHOLD_PX;
    const scrollableDistance = Math.max(0, args.contentHeight - args.viewportHeight);

    // When the current page does not fill the viewport, keep loading until the
    // user can actually scroll or we exhaust history.
    if (scrollableDistance <= threshold) {
        return true;
    }

    const distanceFromHistoryStart = scrollableDistance - args.offsetY;
    return distanceFromHistoryStart <= threshold;
}
