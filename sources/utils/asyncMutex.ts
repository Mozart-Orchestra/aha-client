/**
 * Simple async mutex implementation for protecting critical sections
 */

export class Mutex {
    private locked = false;
    private queue: Array<(unlock: () => void) => void> = [];

    /**
     * Acquire the lock and execute the callback
     */
    async runExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
        // Wait for lock to be available
        await this.acquire();

        try {
            // Execute the critical section
            const result = await callback();
            return result;
        } finally {
            // Always release the lock
            this.release();
        }
    }

    /**
     * Acquire the lock (waits if already locked)
     */
    private async acquire(): Promise<void> {
        if (!this.locked) {
            this.locked = true;
            return;
        }

        // Wait in queue
        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
        });
    }

    /**
     * Release the lock and notify next waiter
     */
    private release(): void {
        if (this.queue.length > 0) {
            // Give lock to next in queue
            const next = this.queue.shift()!;
            next();
        } else {
            // No waiters, release lock
            this.locked = false;
        }
    }

    /**
     * Check if mutex is currently locked
     */
    isLocked(): boolean {
        return this.locked;
    }
}
