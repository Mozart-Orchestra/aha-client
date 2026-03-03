/**
 * R6: Runtime Agent Management API Client
 *
 * Client for server-driven agent lifecycle management:
 * - Spawn agents via daemon RPC
 * - Stop/pause/resume agents
 * - List agents with status
 */

import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

// === Types ===

export type AgentStatus = 'spawning' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';
export type AgentMode = 'claude' | 'codex' | 'ralph';

export interface AgentInfo {
    sessionId: string;
    teamId: string;
    roleId: string;
    mode: AgentMode;
    machineId: string;
    displayName: string | null;
    status: AgentStatus;
    currentTaskId: string | null;
    tokenUsed: number;
    cpuPercent: number;
    memoryMb: number;
    spawnedAt: string;
    lastHeartbeatAt: string;
    error?: string;
}

export interface AgentListResponse {
    agents: AgentInfo[];
    summary: {
        total: number;
        running: number;
        paused: number;
        stopped: number;
    };
}

export interface SpawnAgentRequest {
    roleId: string;
    mode: AgentMode;
    machineId?: string;
    rootPath?: string;
    displayName?: string;
    count?: number;
}

export interface SpawnAgentResponse {
    sessions: Array<{
        sessionId: string;
        roleId: string;
        mode: string;
        machineId: string;
        status: string;
        error?: string;
    }>;
    spawnedAt: string;
}

export interface AgentStatusResponse {
    status: AgentStatus;
    sessionId: string;
    stoppedAt?: string;
    pausedAt?: string;
    resumedAt?: string;
}

export interface SpawnLimitExceededError {
    error: 'spawn_limit_exceeded';
    message: string;
    limit: number;
    current: number;
}

// === API Functions ===

/**
 * List all agents for a team
 */
export async function listAgents(
    credentials: AuthCredentials,
    teamId: string,
    filters?: {
        active?: boolean;
        mode?: string;
        roleId?: string;
    }
): Promise<AgentListResponse> {
    const API_ENDPOINT = getServerUrl();

    const params = new URLSearchParams();
    if (filters?.active !== undefined) {
        params.set('active', String(filters.active));
    }
    if (filters?.mode) {
        params.set('mode', filters.mode);
    }
    if (filters?.roleId) {
        params.set('roleId', filters.roleId);
    }

    const queryString = params.toString();
    const url = `${API_ENDPOINT}/v1/teams/${teamId}/agents${queryString ? `?${queryString}` : ''}`;

    return await backoff(async () => {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list agents: ${response.status}`);
        }

        return await response.json() as AgentListResponse;
    });
}

/**
 * Spawn new agents for a team
 */
export async function spawnAgents(
    credentials: AuthCredentials,
    teamId: string,
    request: SpawnAgentRequest
): Promise<SpawnAgentResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/agents/spawn`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429 && errorData.error === 'spawn_limit_exceeded') {
                throw Object.assign(new Error(errorData.message), {
                    name: 'SpawnLimitExceededError',
                    ...errorData
                }) as Error & SpawnLimitExceededError;
            }
            throw new Error(errorData.message || `Failed to spawn agents: ${response.status}`);
        }

        return await response.json() as SpawnAgentResponse;
    });
}

/**
 * Stop an agent
 */
export async function stopAgent(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string,
    graceful: boolean = true
): Promise<AgentStatusResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/agents/${sessionId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ graceful })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to stop agent: ${response.status}`);
        }

        return await response.json() as AgentStatusResponse;
    });
}

/**
 * Pause an agent
 */
export async function pauseAgent(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string
): Promise<AgentStatusResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/agents/${sessionId}/pause`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to pause agent: ${response.status}`);
        }

        return await response.json() as AgentStatusResponse;
    });
}

/**
 * Resume a paused agent
 */
export async function resumeAgent(
    credentials: AuthCredentials,
    teamId: string,
    sessionId: string
): Promise<AgentStatusResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/teams/${teamId}/agents/${sessionId}/resume`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to resume agent: ${response.status}`);
        }

        return await response.json() as AgentStatusResponse;
    });
}