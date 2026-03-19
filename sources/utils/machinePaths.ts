import { storage } from '@/sync/storage';

export type RecentMachinePath = {
    machineId: string;
    path: string;
};

function isGenericHomeFallback(path: string | null | undefined): boolean {
    if (!path) {
        return false;
    }

    return path === '/home' || path === '/home/';
}

function isPathUsableForMachine(machineId: string | null, path: string | null | undefined): boolean {
    if (!machineId || !path || path.trim().length === 0) {
        return false;
    }

    const machine = storage.getState().machines[machineId];
    const platform = machine?.metadata?.platform?.toLowerCase() || '';
    const homeDir = machine?.metadata?.homeDir;

    if (!isGenericHomeFallback(path)) {
        return true;
    }

    if (homeDir && homeDir !== path) {
        return false;
    }

    return platform.includes('linux');
}

/**
 * Returns the best known path for a machine by checking recent selections first,
 * then falling back to the latest sessions tied to that machine, and finally
 * to the machine's home directory.
 */
export function getRecentPathForMachine(machineId: string | null, recentPaths: RecentMachinePath[]): string {
    if (!machineId) {
        return '';
    }

    const recentPath = recentPaths.find((entry) => entry.machineId === machineId);
    if (recentPath && isPathUsableForMachine(machineId, recentPath.path)) {
        return recentPath.path;
    }

    const machine = storage.getState().machines[machineId];
    const defaultPath = machine?.metadata?.homeDir || '';

    const sessions = Object.values(storage.getState().sessions);
    const pathSet = new Set<string>();
    const pathsWithTimestamps: Array<{ path: string; timestamp: number }> = [];

    sessions.forEach((session) => {
        if (session.metadata?.machineId === machineId && session.metadata?.path) {
            const sessionPath = session.metadata.path;
            if (isPathUsableForMachine(machineId, sessionPath) && !pathSet.has(sessionPath)) {
                pathSet.add(sessionPath);
                pathsWithTimestamps.push({
                    path: sessionPath,
                    timestamp: session.updatedAt || session.createdAt
                });
            }
        }
    });

    pathsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);
    return pathsWithTimestamps[0]?.path || defaultPath;
}

export function getKnownPathsForMachine(
    machineId: string | null,
    recentPaths: RecentMachinePath[],
    limit = 8
): string[] {
    if (!machineId) {
        return [];
    }

    const seen = new Set<string>();
    const results: string[] = [];

    recentPaths.forEach((entry) => {
        if (entry.machineId === machineId && isPathUsableForMachine(machineId, entry.path) && !seen.has(entry.path)) {
            seen.add(entry.path);
            results.push(entry.path);
        }
    });

    const sessions = Object.values(storage.getState().sessions);
    const machineSessions = sessions
        .filter((session) => session.metadata?.machineId === machineId && session.metadata?.path)
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    for (const session of machineSessions) {
        const path = session.metadata?.path;
        if (isPathUsableForMachine(machineId, path) && !seen.has(path)) {
            seen.add(path);
            results.push(path);
        }
        if (results.length >= limit) {
            break;
        }
    }

    const machine = storage.getState().machines[machineId];
    const homeDir = machine?.metadata?.homeDir;
    if (homeDir && !seen.has(homeDir)) {
        results.push(homeDir);
    }

    return results.slice(0, limit);
}

/**
 * Updates the MRU list of machine → path combinations and keeps it at 10 entries.
 */
export function updateRecentMachinePaths(
    currentPaths: RecentMachinePath[],
    machineId: string,
    path: string
): RecentMachinePath[] {
    if (!isPathUsableForMachine(machineId, path)) {
        return currentPaths;
    }
    const filtered = currentPaths.filter((entry) => entry.machineId !== machineId);
    const updated = [{ machineId, path }, ...filtered];
    return updated.slice(0, 10);
}
