import type { TeamMessage } from '@/sync/teamMessageTypes';

export const TEAM_CHAT_MESSAGE_LIMIT = 500;
export const TEAM_CHAT_NEAR_BOTTOM_THRESHOLD_PX = 100;

export function dedupeAndSortTeamMessages(messages: TeamMessage[]): TeamMessage[] {
    return Array.from(new Map(messages.map((message) => [message.id, message])).values())
        .sort((a, b) => a.timestamp - b.timestamp);
}

export function mergeTeamMessages(
    previous: TeamMessage[],
    incoming: TeamMessage[],
    limit = TEAM_CHAT_MESSAGE_LIMIT
): TeamMessage[] {
    const merged = dedupeAndSortTeamMessages([...previous, ...incoming]);
    return merged.length > limit ? merged.slice(-limit) : merged;
}

export function appendTeamMessage(
    previous: TeamMessage[],
    message: TeamMessage,
    limit = TEAM_CHAT_MESSAGE_LIMIT
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
