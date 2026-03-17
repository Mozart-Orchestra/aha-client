/**
 * Evolution API
 *
 * API integration for the v313 agent evolution system.
 * Exposes bypass agent lifecycle and genome registry endpoints.
 *
 * Endpoints:
 *   GET    /v1/teams/:teamId/bypass-agents              - List active bypass agents
 *   DELETE /v1/teams/:teamId/bypass-agents/:id          - Retire a bypass agent
 *   POST   /v1/teams/:teamId/bypass-agents/leases       - Create a bypass agent lease
 *   GET    /v1/teams/:teamId/bypass-agents/leases/:id   - Get lease status
 *   GET    /v1/genomes                                  - List genomes (filterable by teamId)
 *   GET    /v1/genomes/:id/lineage                      - Get genome lineage edges
 *   GET    /v1/genomes/:id/scorecard                    - Get genome scorecard
 *   GET    /v1/runs                                     - List runs for a team
 *   GET    /v1/teams/:teamId/repair-signals             - List repair signals
 */

import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
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
    namespace?: string | null;
    name: string;
    version?: number;
    description: string | null;
    spec: string;   // JSON string of GenomeSpec
    parentSessionId: string;
    teamId: string | null;
    tags?: string | null;
    category?: string | null;
    spawnCount: number;
    lastSpawnedAt: string | null;
    isPublic: boolean;
    feedbackData?: string | null;
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
        checkAuth(response, credentials.token);

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
        checkAuth(response, credentials.token);

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
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as GenomesResponse;
    });
}

// ============================================================================
// Phase 3 — Bypass Lifecycle
// ============================================================================

export type BypassLeaseStatus = 'active' | 'retired' | 'expired';

/**
 * A server-side lease that authorises a bypass agent to operate.
 * Created before spawning; the daemon passes lifecycleTokenId at spawn time.
 */
export interface BypassAgentLease {
    id: string;
    teamId: string;
    sessionId: string | null;
    status: BypassLeaseStatus;
    bypassProfile: 'init' | 'periodic' | 'event' | 'reactive';
    ttlSeconds: number;
    createdAt: string;
    expiresAt: string | null;
    retiredAt: string | null;
}

export interface CreateBypassLeaseParams {
    bypassProfile: 'init' | 'periodic' | 'event' | 'reactive';
    ttlSeconds: number;
    runId?: string;
    triggerEventId?: string;
    parentSessionId?: string;
}

/**
 * Create a bypass agent lease before spawning a bypass session.
 * The returned lease id should be passed as lifecycleTokenId when spawning.
 */
export async function createBypassLease(
    credentials: AuthCredentials,
    teamId: string,
    params: CreateBypassLeaseParams
): Promise<BypassAgentLease> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/teams/${teamId}/bypass-agents/leases`,
            {
                method: 'POST',
                headers: authHeaders(credentials.token),
                body: JSON.stringify(params),
            }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as BypassAgentLease;
    });
}

/**
 * Get the current status of a bypass agent lease.
 * Useful for checking if a lease is still active before acting on it.
 */
export async function getBypassLease(
    credentials: AuthCredentials,
    teamId: string,
    leaseId: string
): Promise<BypassAgentLease> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/teams/${teamId}/bypass-agents/leases/${leaseId}`,
            { headers: authHeaders(credentials.token) }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as BypassAgentLease;
    });
}

// ============================================================================
// Phase 4 — Market / Lineage / Scorecard
// ============================================================================

/**
 * A run represents one execution of a team (one Ralph Loop iteration or manual spawn).
 * Runs are indexed by runId and group all sessions spawned together.
 */
export interface AgentRun {
    id: string;
    teamId: string;
    startedAt: string;
    finishedAt: string | null;
    status: 'running' | 'completed' | 'failed' | 'aborted';
    sessionCount: number;
    bypassSessionCount: number;
}

export interface AgentRunsResponse {
    runs: AgentRun[];
    total: number;
}

/**
 * An edge in the genome lineage graph, connecting parent and child genomes.
 */
export interface LineageEdge {
    id: string;
    parentGenomeId: string;
    childGenomeId: string;
    mutationNote: string | null;
    createdAt: string;
}

/**
 * Scorecard for a genome — aggregate quality metrics derived from hook events.
 */
export interface GenomeScorecard {
    genomeId: string;
    delivery: number;       // 0-100
    integrity: number;      // 0-100
    efficiency: number;     // 0-100
    collaboration: number;  // 0-100
    reliability: number;    // 0-100
    runCount: number;
    lastScoredAt: string | null;
}

/**
 * A repair signal emitted by a supervisor agent when it detects a problem.
 */
export interface RepairSignal {
    id: string;
    teamId: string;
    sessionId: string;
    supervisorSessionId: string;
    type: 'stuck' | 'context_overflow' | 'need_collaborator' | 'error' | 'custom';
    description: string;
    resolvedAt: string | null;
    createdAt: string;
}

export interface RepairSignalsResponse {
    signals: RepairSignal[];
    total: number;
}

/**
 * List runs for a team, most recent first.
 */
export async function fetchRunsByTeam(
    credentials: AuthCredentials,
    teamId: string,
    options?: { limit?: number; offset?: number }
): Promise<AgentRunsResponse> {
    const API_ENDPOINT = getServerUrl();
    const params = new URLSearchParams({ teamId });

    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/runs?${params.toString()}`,
            { headers: authHeaders(credentials.token) }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as AgentRunsResponse;
    });
}

/**
 * Get the lineage graph edges for a genome (parent → child mutations).
 */
export async function fetchGenomeLineage(
    credentials: AuthCredentials,
    genomeId: string
): Promise<LineageEdge[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/genomes/${genomeId}/lineage`,
            { headers: authHeaders(credentials.token) }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        const body = await response.json() as { edges: LineageEdge[] };
        return body.edges;
    });
}

/**
 * Get the aggregate scorecard for a genome.
 */
export async function fetchGenomeScorecard(
    credentials: AuthCredentials,
    genomeId: string
): Promise<GenomeScorecard> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/genomes/${genomeId}/scorecard`,
            { headers: authHeaders(credentials.token) }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as GenomeScorecard;
    });
}

/**
 * List open (unresolved) repair signals for a team.
 */
export async function fetchRepairSignals(
    credentials: AuthCredentials,
    teamId: string,
    options?: { resolved?: boolean; limit?: number }
): Promise<RepairSignalsResponse> {
    const API_ENDPOINT = getServerUrl();
    const params = new URLSearchParams();

    if (options?.resolved !== undefined) params.set('resolved', String(options.resolved));
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    const url = `${API_ENDPOINT}/v1/teams/${teamId}/repair-signals${query ? `?${query}` : ''}`;

    return await backoff(async () => {
        const response = await fetch(url, { headers: authHeaders(credentials.token) });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as RepairSignalsResponse;
    });
}
