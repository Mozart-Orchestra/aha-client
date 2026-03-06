import type { Machine } from '@/sync/storageTypes';
import type { RecentMachinePath } from '@/utils/machinePaths';
import { getRecentPathForMachine } from '@/utils/machinePaths';
import type { NewSessionData } from '@/utils/tempDataStore';

interface BlankSessionDraftOptions {
    machineId?: string;
    path?: string;
    agentType?: 'claude' | 'codex';
    sessionType?: 'simple' | 'worktree';
    sessionName?: string;
}

export interface BlankSessionLaunchContext {
    machineId?: string;
    machineName?: string;
    machineHomeDir?: string;
    machineOnline: boolean;
    path?: string;
    agentType: 'claude' | 'codex';
    sessionType: 'simple' | 'worktree';
}

export function getBlankSessionLaunchContext({
    machines,
    recentMachinePaths,
    lastUsedAgent,
}: {
    machines: Machine[];
    recentMachinePaths: RecentMachinePath[];
    lastUsedAgent?: string | null;
}): BlankSessionLaunchContext {
    const preferredMachine = recentMachinePaths
        .map((entry) => machines.find((machine) => machine.id === entry.machineId))
        .find(Boolean) || machines[0];

    const agentType = lastUsedAgent === 'codex' ? 'codex' : 'claude';

    if (!preferredMachine) {
        return {
            machineOnline: false,
            agentType,
            sessionType: 'simple',
        };
    }

    return {
        machineId: preferredMachine.id,
        machineName: preferredMachine.metadata?.displayName || preferredMachine.metadata?.host || preferredMachine.id,
        machineHomeDir: preferredMachine.metadata?.homeDir || undefined,
        machineOnline: preferredMachine.active,
        path: getRecentPathForMachine(preferredMachine.id, recentMachinePaths),
        agentType,
        sessionType: 'simple',
    };
}

export function buildBlankSessionDraft(prompt: string, roleName?: string, options?: BlankSessionDraftOptions): NewSessionData {
    const trimmedPrompt = prompt.trim();
    const trimmedRole = roleName?.trim();

    return {
        prompt: trimmedPrompt || undefined,
        sessionRole: trimmedRole || undefined,
        machineId: options?.machineId,
        path: options?.path,
        agentType: options?.agentType,
        sessionType: options?.sessionType,
        sessionName: options?.sessionName,
    };
}
