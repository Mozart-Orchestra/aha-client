const DEFAULT_INTERACTIVE_REQUEST_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
        this.name = 'RequestTimeoutError';
    }
}

export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_INTERACTIVE_REQUEST_TIMEOUT_MS,
): Promise<Response> {
    if (typeof AbortController === 'undefined') {
        return await fetch(input, init);
    }

    const controller = new AbortController();
    const upstreamSignal = init.signal;
    const relayAbort = () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (upstreamSignal?.aborted) {
        clearTimeout(timeout);
        throw new RequestTimeoutError(timeoutMs);
    }

    upstreamSignal?.addEventListener('abort', relayAbort, { once: true });

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new RequestTimeoutError(timeoutMs);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        upstreamSignal?.removeEventListener('abort', relayAbort);
    }
}
