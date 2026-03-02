import type { Machine } from '@/sync/storageTypes';

const MACHINE_STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export function isMachineOnline(machine: Machine): boolean {
    if (machine.active) {
        return true;
    }
    if (typeof machine.activeAt === 'number' && machine.activeAt > 0) {
        return Date.now() - machine.activeAt < MACHINE_STALE_THRESHOLD_MS;
    }
    return false;
}
