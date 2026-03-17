import type { ApiEphemeralUpdate } from '../apiTypes';

export type MachineActivityUpdate = Extract<ApiEphemeralUpdate, { type: 'machine-activity' }>;

export class MachineActivityAccumulator {
    private pendingUpdates = new Map<string, MachineActivityUpdate>();
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private flushHandler: (updates: Map<string, MachineActivityUpdate>) => void,
        private debounceDelay: number = 2000,
    ) {}

    addUpdate(update: MachineActivityUpdate): void {
        this.pendingUpdates.set(update.id, update);

        if (this.timeoutId) {
            return;
        }

        this.timeoutId = setTimeout(() => {
            this.flush();
        }, this.debounceDelay);
    }

    flush(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.pendingUpdates.size === 0) {
            return;
        }

        const updatesToFlush = new Map(this.pendingUpdates);
        this.pendingUpdates.clear();
        this.flushHandler(updatesToFlush);
    }

    cancel(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.pendingUpdates.clear();
    }
}
