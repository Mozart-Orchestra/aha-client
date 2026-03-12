/**
 * Evolution API
 *
 * API integration for the v313 agent evolution system.
 * Exposes bypass agent lifecycle and genome registry endpoints.
 *
 * Endpoints:
 *   GET    /v1/teams/:teamId/bypass-agents        - List active bypass agents
 *   DELETE /v1/teams/:teamId/bypass-agents/:id    - Retire a bypass agent
 *   GET    /v1/genomes                            - List genomes (filterable by teamId)
 */

import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

// ============================================================================
// Types
// ============================================================================

export interface BypassAgentPermissions {
    canSpawnAgents: boolean;
    canCreateTeams: boolean;
    canDeployToProduction: boolean;
}

export interface BypassAgent {
    agentId: string;
    teamId: string;
    roleId: string;
    profile: 'init' | 'periodic' | 'event' | 'reactive';
    spawnedAt: number;   // Unix seconds
    expiresAt: number;   // Unix seconds (0 = never)
    permissions: BypassAgentPermissions;
}

export interface BypassAgentsResponse {
    agents: BypassAgent[];
}

export interface GenomeSpec {
    roleId?: string;
    systemPrompt?: string;
    permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'read-only' | 'safe-yolo' | 'yolo';
    tools?: string[];
    modelId?: string;
    workingDirectory?: string;
    customPrompts?: string[];
    tags?: string[];
    version?: number;
}

export interface Genome {
    id: string;
    accountId: string;
    name: string;
    description: string | null;
    spec: string;   // JSON string of GenomeSpec
    parentSessionId: string;
    teamId: string | null;
    spawnCount: number;
    lastSpawnedAt: string | null;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GenomesResponse {
    genomes: Genome[];
    total: number;
}

// ============================================================================
// Helpers
// ============================================================================

function authHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

async function parseError(response: Response): Promise<string> {
    try {
        const body = await response.json();
        return body.error || `Request failed: ${response.status}`;
    } catch {
        return `Request failed: ${response.status}`;
    }
}

// ============================================================================
// Bypass Agents
// ============================================================================

/**
 * List all active bypass agents for a team.
 * Returns agents that have not expired and have not been retired.
 */
export async function fetchBypassAgents(
    credentials: AuthCredentials,
    teamId: string
): Promise<BypassAgentsResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/teams/${teamId}/bypass-agents`,
            { headers: authHeaders(credentials.token) }
        );

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as BypassAgentsResponse;
    });
}

/**
 * Retire (delete) a bypass agent, immediately invalidating its lifecycle token.
 */
export async function retireBypassAgent(
    credentials: AuthCredentials,
    teamId: string,
    agentId: string
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/teams/${teamId}/bypass-agents/${agentId}`,
            {
                method: 'DELETE',
                headers: authHeaders(credentials.token),
            }
        );

        if (!response.ok) {
            throw new Error(await parseError(response));
        }
    });
}

// ============================================================================
// Genomes
// ============================================================================

/**
 * List genomes, optionally filtered by teamId or parentSessionId.
 */
export async function fetchGenomes(
    credentials: AuthCredentials,
    options?: {
        teamId?: string;
        parentSessionId?: string;
        limit?: number;
        offset?: number;
    }
): Promise<GenomesResponse> {
    const API_ENDPOINT = getServerUrl();
    const params = new URLSearchParams();

    if (options?.teamId) params.set('teamId', options.teamId);
    if (options?.parentSessionId) params.set('parentSessionId', options.parentSessionId);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    const url = `${API_ENDPOINT}/v1/genomes${query ? `?${query}` : ''}`;

    return await backoff(async () => {
        const response = await fetch(url, {
            headers: authHeaders(credentials.token),
        });

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as GenomesResponse;
    });
}
