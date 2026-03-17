import type { Session } from '@/sync/storageTypes';
import type { Message } from '@/sync/typesMessage';

export function resolveStickySession<T extends Session | undefined | null>(
    currentSession: T,
    lastKnownSession: T,
): T {
    return (currentSession ?? lastKnownSession ?? undefined) as T;
}

export function resolveMatrixStreamState(params: {
    isLoaded: boolean;
    messages: Message[];
    lastGoodMessages: Message[];
    hasEverLoaded: boolean;
}): {
    displayMessages: Message[];
    showInitialLoading: boolean;
    showEmptyState: boolean;
} {
    const {
        isLoaded,
        messages,
        lastGoodMessages,
        hasEverLoaded,
    } = params;

    if (isLoaded && messages.length > 0) {
        return {
            displayMessages: messages,
            showInitialLoading: false,
            showEmptyState: false,
        };
    }

    if (hasEverLoaded && lastGoodMessages.length > 0) {
        return {
            displayMessages: lastGoodMessages,
            showInitialLoading: false,
            showEmptyState: false,
        };
    }

    return {
        displayMessages: messages,
        showInitialLoading: !hasEverLoaded && !isLoaded,
        showEmptyState: !hasEverLoaded && isLoaded && messages.length === 0,
    };
}
