import type { InvalidateSync } from '@/utils/sync';

type MessageSyncRegistry = Pick<Map<string, InvalidateSync>, 'get' | 'delete'>;

export function stopMissingSessionMessageSync(
    registry: MessageSyncRegistry,
    sessionId: string,
    responseStatus: number,
    onMissingSession?: (() => void) | null,
    warn: (message: string) => void = console.warn,
): boolean {
    if (responseStatus !== 404 && responseStatus !== 403) {
        return false;
    }

    warn(`Session ${sessionId} messages endpoint returned ${responseStatus}; stopping message sync for this session.`);
    registry.get(sessionId)?.stop();
    registry.delete(sessionId);
    onMissingSession?.();
    return true;
}
