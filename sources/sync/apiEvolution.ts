/**
 * Evolution API
 *
 * API integration for the v313 agent evolution system.
 * Exposes bypass agent lifecycle and genome registry endpoints.
 *
 * Endpoints:
 *   GET    /v1/teams/:teamId/bypass-agents              - List active bypass agents
 *   GET    /v1/teams/:teamId/supervisor-state           - Read persisted supervisor facts
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

export interface SupervisorStateSummary {
    teamId: string;
    lastRunAt: number;
    lastConclusion: string;
    lastSessionId: string | null;
    terminated: boolean;
    idleRuns: number;
    pendingAction: {
        type: 'notify_help';
        message: string;
    } | {
        type: 'conditional_escalation';
        condition: string;
        action: string;
        deadline: number;
    } | null;
    calibrationScore: number | null;
}

export interface SupervisorStateResponse {
    state: SupervisorStateSummary | null;
}

/**
 * Compatibility projection of a stored genome spec.
 *
 * Canonical authoring truth is `agent.json v1`, but the server and UI still
 * exchange a flattened AgentImage-style projection in many paths.
 * Keep this surface broad enough that kanban does not silently erase fields
 * that the builder/runtime/tooling already understand.
 */
export interface AgentImage {
    // Tier 0 — identity
    displayName?: string;
    description?: string;
    baseRoleId?: string;
    namespace?: string;
    version?: number;
    tags?: string[];
    category?: string;
    runtimeType?: 'claude' | 'codex' | 'open-code';

    // Legacy compatibility aliases still seen on older read paths.
    roleId?: string;
    tools?: string[];
    workingDirectory?: string;
    customPrompts?: string[];

    // Tier 1 — prompt / collaboration contract
    systemPrompt?: string;
    systemPromptSuffix?: string;
    responsibilities?: string[];
    protocol?: string[];
    capabilities?: string[];
    authorities?: string[];
    contextInjections?: Array<{
        trigger: 'on_join' | 'per_tool_call' | 'on_context_threshold' | 'on_resume';
        threshold?: number;
        content: string;
    }>;
    teamRole?: string;
    handoffProtocol?: string[];
    messaging?: {
        listenFrom?: string[] | '*';
        receiveUserMessages?: boolean;
        replyMode?: 'proactive' | 'responsive' | 'passive';
    };
    behavior?: {
        onIdle?: 'wait' | 'self-assign' | 'ask';
        onBlocked?: 'report' | 'escalate' | 'retry';
        canSpawnAgents?: boolean;
        requireExplicitAssignment?: boolean;
        lifecycle?: 'single-shot' | 'persistent' | 'on-demand';
        autoRetireAfterComplete?: boolean;
    };

    // Tier 2 — model / routing
    modelId?: string;
    fallbackModelId?: string;
    modelProvider?: 'anthropic' | 'zhipu' | 'openai' | 'local' | string;
    preferredModel?: string;
    modelScores?: Record<string, number>;

    // Tier 3 — tool / runtime execution
    allowedTools?: string[];
    disallowedTools?: string[];
    mcpServers?: string[];
    permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'read-only' | 'safe-yolo' | 'yolo';
    accessLevel?: 'read-only' | 'full-access';
    executionPlane?: 'mainline' | 'bypass';
    maxTurns?: number;
    hooks?: {
        preToolUse?: Array<{ matcher: string; command: string; description?: string }>;
        postToolUse?: Array<{ matcher: string; command: string; description?: string }>;
        stop?: Array<{ command: string; description?: string }>;
    };
    skills?: string[];

    // Tier 4 — memory / governance / validation
    memory?: {
        type?: 'session' | 'persistent' | 'shared';
        learnings?: string[];
        iterationGuide?: {
            recentChanges?: string[];
            discoveries?: string[];
            improvements?: string[];
        };
        knowledgeBase?: string[];
    };
    scopeOfResponsibility?: {
        ownedPaths?: string[];
        forbiddenPaths?: string[];
        outOfScope?: string[];
    };
    resume?: {
        specialties?: string[];
        workHistory?: Array<{
            project?: string;
            domain?: string;
            tasksCompleted?: number;
            avgScore?: number;
            period?: string;
        }>;
        performanceRating?: number;
        totalSessions?: number;
        reviews?: string[];
    };
    operations?: {
        commonPatterns?: string[];
        recentChanges?: string[];
        runtimeConfig?: string;
    };
    compatibility?: {
        worksWellWith?: string[];
        requiredMcpServers?: string[];
        requiredEnvVars?: string[];
        minContextTokens?: number;
    };
    validation?: {
        smokeTest?: {
            requiredTools?: string[];
            requiredFiles?: string[];
            healthChecks?: string[];
        };
        minVerifiedScore?: number;
        minEvaluations?: number;
    };
    resourceBudget?: {
        estimatedTokensPerTask?: number;
        contextWindowSize?: 'small' | 'medium' | 'large';
        concurrencyCapable?: boolean;
    };

    // Tier 5 — lifecycle / provenance / triggers
    schedule?: {
        interval?: string;
        maxConcurrent?: number;
        enabled?: boolean;
    };
    onMessage?: {
        patterns?: string[];
        senderRoles?: string[];
        priority?: 'normal' | 'high' | 'urgent';
    };
    onTaskChange?: {
        events?: Array<'created' | 'assigned' | 'blocked' | 'review' | 'completed'>;
        assignedOnly?: boolean;
    };
    trigger?: {
        mode: 'mention' | 'task-assign' | 'scheduled' | 'event';
        conditions?: string[];
    };
    provenance?: {
        parentId?: string;
        mutationNote?: string;
        origin?: 'original' | 'forked' | 'mutated';
    };
    evalCriteria?: string[];
    costProfile?: {
        typicalTokens?: number;
        contextWindowReq?: number;
    };
    lifecycle?: 'experimental' | 'active' | 'deprecated';

    // Canonical agent.json blocks preserved opaquely or semi-structured.
    env?: {
        requiredEnv?: string[];
        optionalEnv?: string[];
        required?: string[];
        optional?: string[];
        secretsPolicy?: string[];
        [key: string]: unknown;
    };
    evaluation?: Record<string, unknown>;
    evolution?: Record<string, unknown>;
    market?: Record<string, unknown>;
    package?: Record<string, unknown>;
    files?: Record<string, string>;
    workspace?: {
        defaultMode?: 'shared' | 'isolated';
        allowedModes?: Array<'shared' | 'isolated'>;
        [key: string]: unknown;
    };

    meta?: Record<string, unknown>;
}

export type AgentSpec = AgentImage;
export type GenomeSpec = AgentImage;

export interface Genome {
    id: string;
    accountId: string;
    namespace?: string | null;
    name: string;
    version?: number;
    status?: 'draft' | 'unverified' | 'verified' | 'official' | 'archived';
    description: string | null;
    spec: string;   // JSON string of AgentImage
    parentSessionId: string | null;
    teamId: string | null;
    tags?: string | null;
    category?: string | null;
    spawnCount: number;
    lastSpawnedAt: string | null;
    isPublic: boolean;
    hubGenomeId?: string | null;
    origin?: 'manual' | 'auto-created' | 'forked' | 'mutated' | 'market-installed' | null;
    variantOf?: string | null;
    mutationNote?: string | null;
    feedbackData?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface GenomesResponse {
    genomes: Genome[];
    total: number;
}

export interface CreateGenomeParams {
    id?: string;
    name: string;
    description?: string;
    spec: string;
    parentSessionId?: string;
    teamId?: string;
    namespace?: string;
    tags?: string;
    category?: string;
    isPublic?: boolean;
    status?: 'draft' | 'unverified' | 'verified' | 'official' | 'archived';
    origin?: 'manual' | 'auto-created' | 'forked' | 'mutated' | 'market-installed';
    variantOf?: string;
    mutationNote?: string;
}

export interface PublishGenomeParams {
    marketplaceUrl?: string;
}

export interface PublishGenomeResponse {
    genome: Genome;
    published: {
        genome?: Record<string, unknown>;
        [key: string]: unknown;
    };
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

/**
 * Read persisted supervisor facts for a team.
 * Returns null when the supervisor has not saved any state yet.
 */
export async function fetchSupervisorState(
    credentials: AuthCredentials,
    teamId: string
): Promise<SupervisorStateResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/teams/${teamId}/supervisor-state`,
            { headers: authHeaders(credentials.token) }
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as SupervisorStateResponse;
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
        ownedOnly?: boolean;
        limit?: number;
        offset?: number;
    }
): Promise<GenomesResponse> {
    const API_ENDPOINT = getServerUrl();
    const params = new URLSearchParams();

    if (options?.teamId) params.set('teamId', options.teamId);
    if (options?.parentSessionId) params.set('parentSessionId', options.parentSessionId);
    if (options?.ownedOnly) params.set('ownedOnly', 'true');
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

/**
 * Create a reusable genome in the private evolution store.
 * Use publishGenome() if the genome should also appear in the marketplace.
 */
export async function createGenome(
    credentials: AuthCredentials,
    params: CreateGenomeParams,
): Promise<{ genome: Genome }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/genomes`, {
            method: 'POST',
            headers: authHeaders(credentials.token),
            body: JSON.stringify(params),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as { genome: Genome };
    });
}

/**
 * Publish a private genome to genome-hub so it becomes visible in the marketplace.
 */
export async function publishGenome(
    credentials: AuthCredentials,
    genomeId: string,
    params: PublishGenomeParams = {},
): Promise<PublishGenomeResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/genomes/${genomeId}/publish`, {
            method: 'POST',
            headers: authHeaders(credentials.token),
            body: JSON.stringify(params),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as PublishGenomeResponse;
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

// ============================================================================
// Phase 5 — Entity Evidence / Manual Evolution Controls
// ============================================================================

export interface EntityLogRef {
    kind: 'claude' | 'codex' | 'team' | 'daemon' | 'git' | 'browser' | 'other';
    path: string;
    sessionId?: string;
}

export interface EntityTrialRecord {
    id: string;
    hubEntityId: string;
    entityVersion: number;
    teamId: string | null;
    sessionId: string | null;
    contextNarrative: string | null;
    logRefs: string | null;
    startedAt: string;
    endedAt: string | null;
}

export interface EntityVerdictRecord {
    id: string;
    trialId: string;
    readerRole: string;
    readerSessionId: string | null;
    content: string;
    score: number | null;
    action: 'keep' | 'keep_with_guardrails' | 'mutate' | 'discard' | null;
    dimensions: string | null;
    createdAt: string;
}

export type ManualEvolutionAction = 'keep' | 'keep_with_guardrails' | 'mutate' | 'discard';

export type EntityDiffChange = {
    type: 'kv';
    path: string;
    from?: unknown;
    to: unknown;
} | {
    type: 'string';
    path: string;
    op: 'append' | 'replace' | 'remove';
    content: string;
    from?: string;
} | {
    type: 'narrative';
    content: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildDiffChanges(
    parentValue: unknown,
    nextValue: unknown,
    pathPrefix = '',
): EntityDiffChange[] {
    if (JSON.stringify(parentValue) === JSON.stringify(nextValue)) {
        return [];
    }

    if (!pathPrefix) {
        if (!isPlainObject(parentValue) || !isPlainObject(nextValue)) {
            return [];
        }

        const changes: EntityDiffChange[] = [];
        const keySet = new Set([
            ...Object.keys(parentValue),
            ...Object.keys(nextValue),
        ]);

        for (const key of [...keySet].sort()) {
            changes.push(...buildDiffChanges(parentValue[key], nextValue[key], key));
        }

        return changes;
    }

    if (nextValue === undefined) {
        return [{ type: 'kv', path: pathPrefix, from: parentValue, to: undefined }];
    }

    if (parentValue === undefined) {
        return [{ type: 'kv', path: pathPrefix, to: nextValue }];
    }

    if (isPlainObject(parentValue) && isPlainObject(nextValue)) {
        const changes: EntityDiffChange[] = [];
        const keySet = new Set([
            ...Object.keys(parentValue),
            ...Object.keys(nextValue),
        ]);

        for (const key of [...keySet].sort()) {
            changes.push(...buildDiffChanges(
                parentValue[key],
                nextValue[key],
                `${pathPrefix}.${key}`,
            ));
        }

        return changes;
    }

    return [{ type: 'kv', path: pathPrefix, from: parentValue, to: nextValue }];
}

function computeSpecDiffChanges(parentSpec: string, nextSpec: string): EntityDiffChange[] {
    try {
        const parentParsed = JSON.parse(parentSpec) as unknown;
        const nextParsed = JSON.parse(nextSpec) as unknown;
        return buildDiffChanges(parentParsed, nextParsed);
    } catch {
        return [];
    }
}

export interface GenomeForkParams {
    namespace: string;
    name: string;
    version?: number;
    description?: string | null;
    spec?: string;
    tags?: string | null;
    category?: string | null;
    isPublic?: boolean;
    publisherId?: string | null;
}

export interface GenomePromoteResponse {
    genome: Genome;
    validation: Record<string, unknown>;
}

export interface SubmitUserVerdictParams {
    namespace: string;
    name: string;
    entityId?: string;
    teamId?: string;
    sessionId?: string;
    contextNarrative?: string;
    logRefs?: EntityLogRef[];
    readerRole: string;
    readerSessionId?: string;
    content: string;
    score: number;
    action: ManualEvolutionAction;
    dimensions?: Record<string, number>;
    materializeFeedback?: boolean;
}

export async function fetchEntityTrials(
    credentials: AuthCredentials,
    entityId: string,
): Promise<EntityTrialRecord[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/entities/id/${encodeURIComponent(entityId)}/trials`,
            { headers: authHeaders(credentials.token) },
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        const body = await response.json() as { trials: EntityTrialRecord[] };
        return body.trials ?? [];
    });
}

export async function fetchTrialVerdicts(
    credentials: AuthCredentials,
    trialId: string,
): Promise<EntityVerdictRecord[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/trials/${encodeURIComponent(trialId)}/verdicts`,
            { headers: authHeaders(credentials.token) },
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        const body = await response.json() as { verdicts: EntityVerdictRecord[] };
        return body.verdicts ?? [];
    });
}

export async function materializeEntityFeedback(
    credentials: AuthCredentials,
    entityId: string,
): Promise<Record<string, unknown>> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/entities/id/${encodeURIComponent(entityId)}/feedback/materialize`,
            {
                method: 'POST',
                headers: authHeaders(credentials.token),
            },
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        const body = await response.json() as { feedback?: Record<string, unknown> };
        return body.feedback ?? {};
    });
}

export async function submitUserVerdict(
    credentials: AuthCredentials,
    params: SubmitUserVerdictParams,
): Promise<{ trial: EntityTrialRecord; verdict: EntityVerdictRecord; feedback: Record<string, unknown> | null }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        let trial: EntityTrialRecord | null = null;

        if (params.entityId && params.sessionId) {
            const existingTrials = await fetchEntityTrials(credentials, params.entityId);
            trial = existingTrials.find((entry) =>
                entry.sessionId === params.sessionId
                && (entry.endedAt == null || entry.endedAt === '')
            ) ?? null;
        }

        if (!trial) {
            const trialResponse = await fetch(
                `${API_ENDPOINT}/v1/entities/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/trials`,
                {
                    method: 'POST',
                    headers: authHeaders(credentials.token),
                    body: JSON.stringify({
                        teamId: params.teamId,
                        sessionId: params.sessionId,
                        contextNarrative: params.contextNarrative,
                        logRefs: params.logRefs,
                    }),
                },
            );
            checkAuth(trialResponse, credentials.token);
            if (!trialResponse.ok) {
                throw new Error(await parseError(trialResponse));
            }

            const trialBody = await trialResponse.json() as { trial: EntityTrialRecord };
            trial = trialBody.trial;
        }

        const verdictResponse = await fetch(
            `${API_ENDPOINT}/v1/trials/${encodeURIComponent(trial.id)}/verdicts`,
            {
                method: 'POST',
                headers: authHeaders(credentials.token),
                body: JSON.stringify({
                    readerRole: params.readerRole,
                    readerSessionId: params.readerSessionId,
                    content: params.content,
                    score: params.score,
                    action: params.action,
                    dimensions: params.dimensions,
                    contextNarrative: params.contextNarrative,
                }),
            },
        );
        checkAuth(verdictResponse, credentials.token);
        if (!verdictResponse.ok) {
            throw new Error(await parseError(verdictResponse));
        }

        const verdictBody = await verdictResponse.json() as { verdict: EntityVerdictRecord };
        const verdict = verdictBody.verdict;

        let feedback: Record<string, unknown> | null = null;
        if (params.materializeFeedback !== false && params.entityId) {
            feedback = await materializeEntityFeedback(credentials, params.entityId);
        }

        return { trial, verdict, feedback };
    });
}

export async function triggerEvolve(
    credentials: AuthCredentials,
    params: {
        namespace: string;
        name: string;
        description: string;
        verdictRefs?: string[];
        changes: EntityDiffChange[];
        strategy?: 'conservative' | 'moderate' | 'radical';
        authorRole?: string;
        authorSession?: string;
    },
): Promise<{ genome?: Genome; entity?: Record<string, unknown>; diff?: Record<string, unknown> }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/entities/${encodeURIComponent(params.namespace)}/${encodeURIComponent(params.name)}/diffs`,
            {
                method: 'POST',
                headers: authHeaders(credentials.token),
                body: JSON.stringify(params),
            },
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as { genome?: Genome; entity?: Record<string, unknown>; diff?: Record<string, unknown> };
    });
}

export async function forkGenome(
    credentials: AuthCredentials,
    genomeId: string,
    params: GenomeForkParams,
): Promise<{ genome: Genome; operation: 'fork' | 'clone' }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(
            `${API_ENDPOINT}/v1/genomes/id/${encodeURIComponent(genomeId)}/fork`,
            {
                method: 'POST',
                headers: authHeaders(credentials.token),
                body: JSON.stringify(params),
            },
        );
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        return await response.json() as { genome: Genome; operation: 'fork' | 'clone' };
    });
}

export async function rollbackGenome(
    credentials: AuthCredentials,
    params: {
        namespace: string;
        name: string;
        targetVersion: number;
        currentSpec: string;
        targetSpec: string;
        verdictRefs?: string[];
        authorRole?: string;
        authorSession?: string;
    },
): Promise<{ genome?: Genome; entity?: Record<string, unknown>; diff?: Record<string, unknown> }> {
    const rollbackChanges = computeSpecDiffChanges(params.currentSpec, params.targetSpec);
    const description = `Manual rollback to v${params.targetVersion}`;
    const changes: EntityDiffChange[] = [
        ...rollbackChanges,
        { type: 'narrative', content: description },
    ];

    return await triggerEvolve(credentials, {
        namespace: params.namespace,
        name: params.name,
        description,
        verdictRefs: params.verdictRefs,
        changes,
        strategy: 'conservative',
        authorRole: params.authorRole,
        authorSession: params.authorSession,
    });
}
