export type SpawnRunStatus = 'pending' | 'active' | 'failed';

export type AgentLifecycle = {
    runStatus?: SpawnRunStatus;
    spawnRequestedAt?: number;
    spawnedAt?: number;
    processStartedAt?: number;
    handshakeReadyAt?: number;
    taskAckedAt?: number;
    taskAckedTaskId?: string;
    [key: string]: unknown;
};

export type SpawnSessionOutcome =
    | { status: 'active'; sessionId: string; sessionTag?: string }
    | { status: 'pending'; sessionTag?: string; pendingSessionId?: string; pid?: number }
    | { status: 'failed'; error: string };

export function buildPendingSpawnLifecycle(
    current?: AgentLifecycle | null,
    now = Date.now(),
): AgentLifecycle {
    return {
        ...(current ?? {}),
        spawnRequestedAt: current?.spawnRequestedAt ?? now,
        runStatus: 'pending',
    };
}

export function buildActiveSpawnLifecycle(
    current?: AgentLifecycle | null,
    now = Date.now(),
): AgentLifecycle {
    return {
        ...(current ?? {}),
        spawnRequestedAt: current?.spawnRequestedAt ?? now,
        spawnedAt: current?.spawnedAt ?? now,
        runStatus: 'active',
    };
}

export function buildFailedSpawnLifecycle(
    current?: AgentLifecycle | null,
    now = Date.now(),
): AgentLifecycle {
    return {
        ...(current ?? {}),
        spawnRequestedAt: current?.spawnRequestedAt ?? now,
        runStatus: 'failed',
    };
}

export function isSpawnRunStatus(value: unknown): value is SpawnRunStatus {
    return value === 'pending' || value === 'active' || value === 'failed';
}
