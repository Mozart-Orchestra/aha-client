import type { Machine } from '@/sync/storageTypes';
import type { RecentMachinePath } from '@/utils/machinePaths';
import { isMachineOnline } from '@/utils/machineUtils';

export function getPreferredMachineId(
    machines: Machine[],
    recentPaths: RecentMachinePath[],
): string | null {
    if (machines.length === 0) {
        return null;
    }

    const machineMap = new Map(machines.map((machine) => [machine.id, machine]));

    for (const entry of recentPaths) {
        const machine = machineMap.get(entry.machineId);
        if (machine && isMachineOnline(machine)) {
            return machine.id;
        }
    }

    const onlineMachine = machines.find(isMachineOnline);
    if (onlineMachine) {
        return onlineMachine.id;
    }

    for (const entry of recentPaths) {
        if (machineMap.has(entry.machineId)) {
            return entry.machineId;
        }
    }

    return machines[0]?.id ?? null;
}
