import type { Machine } from '@/sync/storageTypes';

const MACHINE_STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export type MachineDaemonStatus = 'unknown' | 'stopped' | 'likely_alive';

export function isMachineArchived(machine: Machine): boolean {
    return typeof machine.archivedAt === 'number' && machine.archivedAt > 0;
}

export function isMachineOnline(machine: Machine): boolean {
    if (machine.active) {
        return true;
    }
    if (typeof machine.activeAt === 'number' && machine.activeAt > 0) {
        return Date.now() - machine.activeAt < MACHINE_STALE_THRESHOLD_MS;
    }
    return false;
}

export function getMachineDaemonStatus(machine: Machine | null | undefined): MachineDaemonStatus {
    if (!machine) {
        return 'unknown';
    }

    const metadata = machine.metadata as { daemonLastKnownStatus?: string } | null;
    if (metadata?.daemonLastKnownStatus === 'shutting-down') {
        return 'stopped';
    }

    return isMachineOnline(machine) ? 'likely_alive' : 'stopped';
}

export function resolveMachineArchivedAt(
    machineUpdate: { archivedAt?: number | null },
    currentMachine?: Pick<Machine, 'archivedAt'> | null,
): number | null {
    if (Object.prototype.hasOwnProperty.call(machineUpdate, 'archivedAt')) {
        return machineUpdate.archivedAt ?? null;
    }

    return currentMachine?.archivedAt ?? null;
}

function getMachineDisplayIdentity(machine: Machine): string | null {
    const host = machine.metadata?.host?.trim().toLowerCase();
    return host || null;
}

function compareMachineDisplayPriority(left: Machine, right: Machine): number {
    const archivedDelta = Number(isMachineArchived(left)) - Number(isMachineArchived(right));
    if (archivedDelta !== 0) {
        return archivedDelta;
    }

    const onlineDelta = Number(isMachineOnline(right)) - Number(isMachineOnline(left));
    if (onlineDelta !== 0) {
        return onlineDelta;
    }

    const freshnessDelta = (right.updatedAt || right.activeAt || right.createdAt) - (left.updatedAt || left.activeAt || left.createdAt);
    if (freshnessDelta !== 0) {
        return freshnessDelta;
    }

    return right.createdAt - left.createdAt;
}

export function dedupeMachinesForDisplay(machines: Machine[]): Machine[] {
    const sorted = [...machines].sort(compareMachineDisplayPriority);
    const deduped: Machine[] = [];
    const seenHosts = new Set<string>();

    for (const machine of sorted) {
        const identity = getMachineDisplayIdentity(machine);
        if (!identity) {
            deduped.push(machine);
            continue;
        }

        if (seenHosts.has(identity)) {
            continue;
        }

        seenHosts.add(identity);
        deduped.push(machine);
    }

    return deduped;
}
