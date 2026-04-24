import type { TeamMessage } from './teamMessageTypes';

export const TEAM_MESSAGE_LIMIT = 500;

export function dedupeAndSortTeamMessages(messages: TeamMessage[]): TeamMessage[] {
    return Array.from(new Map(messages.map((message) => [message.id, message])).values())
        .sort((a, b) => a.timestamp - b.timestamp);
}

export function mergeTeamMessages(
    previous: TeamMessage[],
    incoming: TeamMessage[],
    limit: number | null = TEAM_MESSAGE_LIMIT
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
    limit: number | null = TEAM_MESSAGE_LIMIT
): TeamMessage[] {
    return mergeTeamMessages(previous, [message], limit);
}

export function reconcileTeamMessage(
    previous: TeamMessage[],
    incoming: TeamMessage,
    limit: number | null = TEAM_MESSAGE_LIMIT
): { messages: TeamMessage[]; changed: boolean } {
    const existing = previous.find((message) => message.id === incoming.id);
    return {
        messages: appendTeamMessage(previous, incoming, limit),
        changed: !existing || JSON.stringify(existing) !== JSON.stringify(incoming),
    };
}
