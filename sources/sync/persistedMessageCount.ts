export function getNextPersistedMessageCount(params: {
    currentPersistedCount?: number;
    currentLoadedCount: number;
    alreadyReceived: boolean;
}): number | null {
    if (params.alreadyReceived) {
        return null;
    }

    return Math.max(
        params.currentPersistedCount ?? 0,
        params.currentLoadedCount,
    ) + 1;
}
