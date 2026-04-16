export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function exponentialBackoffDelay(currentFailureCount: number, minDelay: number, maxDelay: number, maxFailureCount: number) {
    let maxDelayRet = minDelay + ((maxDelay - minDelay) / maxFailureCount) * Math.max(currentFailureCount, maxFailureCount);
    return Math.round(Math.random() * maxDelayRet);
}

export type BackoffFunc = <T>(callback: () => Promise<T>) => Promise<T>;

/** Error that should not be retried by backoff */
export class NonRetryableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NonRetryableError';
    }
}

export function createBackoff(
    opts?: {
        onError?: (e: any, failuresCount: number) => void,
        minDelay?: number,
        maxDelay?: number,
        maxFailureCount?: number,
        maxRetries?: number,
    }): BackoffFunc {
    return async <T>(callback: () => Promise<T>): Promise<T> => {
        let currentFailureCount = 0;
        const minDelay = opts && opts.minDelay !== undefined ? opts.minDelay : 250;
        const maxDelay = opts && opts.maxDelay !== undefined ? opts.maxDelay : 1000;
        const maxFailureCount = opts && opts.maxFailureCount !== undefined ? opts.maxFailureCount : 50;
        const maxRetries = opts?.maxRetries;
        while (true) {
            try {
                return await callback();
            } catch (e) {
                if (e instanceof NonRetryableError) {
                    throw e;
                }
                currentFailureCount++;
                if (maxRetries !== undefined && currentFailureCount >= maxRetries) {
                    throw new NonRetryableError(
                        e instanceof Error ? e.message : 'Max retries exceeded'
                    );
                }
                if (opts && opts.onError) {
                    opts.onError(e, currentFailureCount);
                }
                const delayCount = Math.min(currentFailureCount, maxFailureCount);
                let waitForRequest = exponentialBackoffDelay(delayCount, minDelay, maxDelay, maxFailureCount);
                await delay(waitForRequest);
            }
        }
    };
}

export let backoff = createBackoff({ onError: (e) => { console.warn(e); } });
