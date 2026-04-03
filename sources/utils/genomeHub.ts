/**
 * Genome Hub API client — talks to the standalone marketplace server.
 * Base URL must be provided via EXPO_PUBLIC_GENOME_HUB_URL.
 */

const BASE = (() => {
    const url = process.env.EXPO_PUBLIC_GENOME_HUB_URL?.trim();
    if (!url) {
        console.warn(
            '[genomeHub] EXPO_PUBLIC_GENOME_HUB_URL is not configured — refusing to fall back silently',
        );
        throw new Error('EXPO_PUBLIC_GENOME_HUB_URL is not configured — genome-hub URL is required');
    }
    return url.replace(/\/$/, '');
})();
const GENOME_BY_NAME_TTL_MS = 30_000;
const genomeByNameCache = new Map<string, { expiresAt: number; value: Promise<GenomeRecord | null> }>();
const OFFICIAL_GENOME_ALIASES: Record<string, string> = {
    architect: 'researcher',
    'solution-architect': 'researcher',
    framer: 'researcher',
    builder: 'implementer',
    reviewer: 'qa-engineer',
    qa: 'qa-engineer',
    scout: 'researcher',
    observer: 'researcher',
    orchestrator: 'master',
    'project-manager': 'master',
    'product-owner': 'master',
    'business-analyst': 'researcher',
    'product-designer': 'researcher',
    'ux-designer': 'researcher',
    'ux-researcher': 'researcher',
    scribe: 'researcher',
    'technical-writer': 'researcher',
    'spec-writer': 'researcher',
};

export function resolveCanonicalGenomeName(namespace: string, name: string): string {
    const trimmedName = name.trim();
    const normalizedName = name.trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (namespace.trim().toLowerCase() !== '@official') {
        return trimmedName;
    }
    return OFFICIAL_GENOME_ALIASES[normalizedName] ?? normalizedName;
}

export interface AgentVerdict {
    evaluationCount: number;
    avgScore: number;
    sessionScore?: {
        taskCompletion: number;
        codeQuality: number;
        collaboration: number;
        overall: number;
    };
    dimensions: {
        delivery: number;
        integrity: number;
        efficiency: number;
        collaboration: number;
        reliability: number;
    };
    distribution: { excellent: number; good: number; fair: number; poor: number };
    suggestions: string[];
    latestAction: string;
}

export interface GenomeRecord {
    id: string;
    kind?: 'agent' | 'legion';           // evolution: entity type (absent on pre-migration records)
    namespace: string | null;
    name: string;
    version: number;
    status: 'draft' | 'unverified' | 'verified' | 'official' | 'archived';
    description: string | null;
    seed?: string | null;                  // evolution: original v1 spec (absent on pre-migration records)
    spec: string;
    tags: string | null;
    category: string | null;
    isPublic: boolean;
    spawnCount: number;
    downloadCount: number;
    starCount: number;
    feedbackData: string | null;
    publisherId: string | null;
    parentId: string | null;
    runtimeType?: string | null;           // evolution: kernel extraction (absent on pre-migration)
    executionPlane?: string | null;         // evolution: kernel extraction
    permissionMode?: string | null;         // evolution: kernel extraction
    lifecycle: 'experimental' | 'active' | 'deprecated' | null;
    createdAt: string;
    updatedAt: string;
}

// ── Evolution types (from genome-hub) ──────────────────────────────

export interface AgentPlugRecord {
    id: string;
    genomeId: string;
    version: number;
    description: string;
    verdictRefs: string | null;
    changes: string;
    strategy: string | null;
    authorRole: string | null;
    createdAt: string;
}

export type AgentPlug = AgentPlugRecord;
export type GenomeDiffRecord = AgentPlugRecord;

export interface DiffLedgerEntry {
    id: string;
    genomeId: string;
    version: number;
    seqNo: number;
    timestamp: string;
    diffType: 'kv' | 'string' | 'narrative';
    path?: string | null;
    op?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    content?: string | null;
}

export interface TrialRecord {
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

export interface AgentVerdictRecord {
    id: string;
    trialId: string;
    readerRole: string;
    readerSessionId: string | null;
    content: string;
    score: number | null;
    action: string | null;
    dimensions: string | null;
    createdAt: string;
}

export type VerdictRecord = AgentVerdictRecord;
export type GenomeFeedback = AgentVerdict;

export function parseAgentVerdict(feedbackData: string | null): AgentVerdict | null {
    if (!feedbackData) return null;
    try {
        return JSON.parse(feedbackData) as AgentVerdict;
    } catch {
        return null;
    }
}

export const parseFeedback = parseAgentVerdict;

export interface SearchResult {
    genomes: GenomeRecord[];
    total: number;
}

export interface SearchParams {
    q?: string;
    namespace?: string;
    category?: string;
    limit?: number;
    offset?: number;
}

export async function searchGenomes(params: SearchParams = {}): Promise<SearchResult> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.namespace) query.set('namespace', params.namespace);
    if (params.category) query.set('category', params.category);
    if (params.limit != null) query.set('limit', String(params.limit));
    if (params.offset != null) query.set('offset', String(params.offset));

    const qs = query.toString();
    const res = await fetch(`${BASE}/genomes${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(`Genome Hub error: ${res.status}`);
    return res.json() as Promise<SearchResult>;
}

/** Fetch a genome by namespace + name (latest version). Returns null if not found. */
export async function fetchGenomeByName(namespace: string, name: string): Promise<GenomeRecord | null> {
    const resolvedName = resolveCanonicalGenomeName(namespace, name);
    const cacheKey = `${namespace}::${resolvedName}`;
    const cached = genomeByNameCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const request = (async () => {
        try {
            const encodedNs = encodeURIComponent(namespace);
            const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}`);
            if (res.status === 429) {
                return null;
            }
            if (!res.ok) return null;
            const data = await res.json() as { genome?: GenomeRecord };
            return data.genome ?? null;
        } catch {
            return null;
        }
    })();

    genomeByNameCache.set(cacheKey, {
        value: request,
        expiresAt: Date.now() + GENOME_BY_NAME_TTL_MS,
    });

    try {
        return await request;
    } catch {
        return null;
    }
}

/** Fetch all published versions for a genome lineage from genome-hub. */
export async function fetchGenomeVersions(namespace: string, name: string): Promise<GenomeRecord[]> {
    try {
        const encodedNs = encodeURIComponent(namespace);
        const resolvedName = resolveCanonicalGenomeName(namespace, name);
        const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}/versions`);
        if (!res.ok) return [];
        const data = await res.json() as { versions?: GenomeRecord[] };
        return data.versions ?? [];
    } catch {
        return [];
    }
}

/** Fetch a specific immutable published version from genome-hub. */
export async function fetchGenomeVersion(
    namespace: string,
    name: string,
    version: number,
): Promise<GenomeRecord | null> {
    try {
        const encodedNs = encodeURIComponent(namespace);
        const resolvedName = resolveCanonicalGenomeName(namespace, name);
        const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}/${encodeURIComponent(String(version))}`);
        if (!res.ok) return null;
        const data = await res.json() as { genome?: GenomeRecord };
        return data.genome ?? null;
    } catch {
        return null;
    }
}

export function parseTags(tagsJson: string | null): string[] {
    if (!tagsJson) return [];
    try {
        const arr = JSON.parse(tagsJson);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export type TeamAuthority =
    | 'user.reply'
    | 'message.route'
    | 'task.create'
    | 'task.assign'
    | 'task.update.any'
    | 'task.approve'
    | 'task.start.self'
    | 'task.complete.self'
    | 'agent.spawn';

export interface LegionMemberOverlay {
    promptSuffix?: string;
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
    };
    authorities?: TeamAuthority[];
}

export type CorpsMemberOverlay = LegionMemberOverlay;

export interface LegionTaskPolicy {
    boardIsSourceOfTruth?: boolean;
    requireTaskForExecution?: boolean;
    forbidChatOnlyExecution?: boolean;
    forbidPeerToPeerRouting?: boolean;
}

export type CorpsTaskPolicy = LegionTaskPolicy;

export interface LegionImage {
    namespace: string;
    name: string;
    version: number;
    description: string;
    tags?: string[];
    category?: string;
    members: {
        genome?: string | null;
        genomeRef?: string | null;
        roleAlias?: string;
        role?: string;
        displayName?: string;
        count?: number;
        required?: boolean;
        overlay?: LegionMemberOverlay;
    }[];
    bootContext?: {
        teamDescription?: string;
        initialObjective?: string;
        sharedContext?: string[];
        commandChain?: string[];
        taskPolicy?: LegionTaskPolicy;
    };
}

export type CorpsSpec = LegionImage;
export type LegionSpec = LegionImage;

export function parseLegionImage(specJson: string): LegionImage | null {
    try {
        return JSON.parse(specJson) as LegionImage;
    } catch {
        return null;
    }
}

export const parseCorpsSpec = parseLegionImage;
export const parseLegionSpec = parseLegionImage;

export function getLegionMemberReference(member: {
    genome?: string | null;
    genomeRef?: string | null;
} | null | undefined): string | null {
    const ref = member?.genome ?? member?.genomeRef;
    return typeof ref === 'string' && ref.trim().length > 0 ? ref.trim() : null;
}

export function getLegionMemberDisplayName(member: {
    roleAlias?: string | null;
    displayName?: string | null;
    role?: string | null;
    genome?: string | null;
    genomeRef?: string | null;
} | null | undefined): string {
    for (const value of [member?.roleAlias, member?.displayName, member?.role]) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }

    const ref = getLegionMemberReference(member);
    if (!ref) {
        return '?';
    }

    const tail = ref.split('/').filter(Boolean).pop() ?? ref;
    const label = tail.split('@')[0]?.trim();
    return label || ref;
}

export interface AgentPackageRef {
    ref: string;
    version: number;
    digest?: string;
    source?: 'hub' | 'server' | 'local-file';
}

export interface RuntimeAdapterSpec {
    runtime: 'claude' | 'codex' | 'open-code';
    entry?: {
        instructionFile?: string;
        bootstrapPrompt?: string;
        workingDirectoryMode?: 'inherit' | 'fixed';
    };
    model?: {
        provider?: 'anthropic' | 'zhipu' | 'openai' | 'local' | string;
        primary?: string;
        fallback?: string;
        preferred?: string;
    };
    tools?: {
        allowed?: string[];
        disallowed?: string[];
        mcpServers?: string[];
        skills?: string[];
        hooks?: {
            preToolUse?: Array<{ matcher: string; command: string; description?: string }>;
            postToolUse?: Array<{ matcher: string; command: string; description?: string }>;
            stop?: Array<{ command: string; description?: string }>;
        };
    };
    sandbox?: {
        permissionMode?: string;
        accessLevel?: string;
        executionPlane?: 'mainline' | 'bypass';
        maxTurns?: number;
    };
    env?: {
        requiredEnv?: string[];
        optionalEnv?: string[];
        secretsPolicy?: string[];
    };
    io?: {
        expects?: string[];
        produces?: string[];
        artifactFormats?: string[];
    };
    evidence?: {
        logKinds?: string[];
        scorecardSchemaVersion?: string;
    };
}

// ─── AgentImage (display-only subset of the canonical spec) ──────────────────

export interface AgentImage {
    // Tier 0 — Identity
    displayName?: string;
    description?: string;
    baseRoleId?: string;
    namespace?: string;
    version?: number;
    tags?: string[];
    category?: string;
    runtimeType?: 'claude' | 'codex' | 'open-code';

    // Tier 1 — Prompt (capabilities only, NOT raw systemPrompt)
    systemPrompt?: string;
    systemPromptSuffix?: string;
    responsibilities?: string[];
    protocol?: string[];
    capabilities?: string[];
    authorities?: TeamAuthority[];

    // Tier 2 — Model
    modelId?: string;
    fallbackModelId?: string;
    modelProvider?: string;

    // Tier 3 — Tool access
    allowedTools?: string[];
    disallowedTools?: string[];
    mcpServers?: string[];

    // Tier 4 — Permissions & execution
    permissionMode?: string;
    accessLevel?: string;
    executionPlane?: string;
    maxTurns?: number;
    contextInjections?: Array<{
        trigger: 'on_join' | 'per_tool_call' | 'on_context_threshold' | 'on_resume';
        threshold?: number;
        content: string;
    }>;
    teamRole?: string;
    handoffProtocol?: string[];

    // Tier 7 — Messaging & behavior
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
    };
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
    modelScores?: Record<string, number>;
    preferredModel?: string;
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

    // Tier 8 — Hooks
    hooks?: {
        preToolUse?: Array<{ matcher: string; command: string; description?: string }>;
        postToolUse?: Array<{ matcher: string; command: string; description?: string }>;
        stop?: Array<{ command: string; description?: string }>;
    };

    // Tier 9 — Skills
    skills?: string[];

    meta?: Record<string, unknown>;
}

export type GenomeSpec = AgentImage;
export type AgentSpec = AgentImage;

export interface CanonicalAgentCard {
    kind: 'aha.agent.v1';
    identity: AgentPackageRef & {
        namespace: string;
        name: string;
        displayName?: string;
        description?: string;
    };
    genome: AgentImage;
    adapters?: {
        claude?: RuntimeAdapterSpec;
        codex?: RuntimeAdapterSpec;
        'open-code'?: RuntimeAdapterSpec;
    };
    market?: {
        category?: string;
        tags?: string[];
        lifecycle?: 'experimental' | 'active' | 'deprecated';
        tagline?: string;
    };
    lineage?: {
        origin?: 'original' | 'forked' | 'mutated';
        parentId?: string;
        variantOf?: string;
        mutationNote?: string;
    };
}

export type AgentPackageManifest = CanonicalAgentCard;

export interface A2AProjectionCard {
    protocolVersion: string;
    name: string;
    description: string;
    url: string;
    version?: string;
    preferredTransport?: string;
    defaultInputModes?: string[];
    defaultOutputModes?: string[];
    capabilities?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    security?: Array<Record<string, unknown>>;
    skills?: Array<{
        id: string;
        name: string;
        description?: string;
        tags?: string[];
        examples?: string[];
        inputModes?: string[];
        outputModes?: string[];
    }>;
}

export function parseAgentImage(specJson: string): AgentImage | null {
    try {
        return JSON.parse(specJson) as AgentImage;
    } catch {
        return null;
    }
}

export const parseSpec = parseAgentImage;

export interface FavoriteGenomeResponse {
    genomes: GenomeRecord[];
    total: number;
}

export interface GenomeFavoriteRecord {
    id: string;
    genomeId: string;
    actorId: string;
    createdAt: string;
}

export interface GenomeFavoriteStatus {
    genome: GenomeRecord;
    favorite: GenomeFavoriteRecord | null;
    isFavorited: boolean;
}

export async function fetchFavoriteGenomes(actorId: string): Promise<FavoriteGenomeResponse> {
    const res = await fetch(`${BASE}/genomes/favorites?actorId=${encodeURIComponent(actorId)}`);
    if (!res.ok) throw new Error(`Genome Hub error: ${res.status}`);
    return res.json() as Promise<FavoriteGenomeResponse>;
}

export async function fetchGenomeFavoriteStatus(id: string, actorId: string): Promise<GenomeFavoriteStatus | null> {
    try {
        const res = await fetch(`${BASE}/genomes/id/${encodeURIComponent(id)}/favorite/${encodeURIComponent(actorId)}`);
        if (!res.ok) return null;
        return res.json() as Promise<GenomeFavoriteStatus>;
    } catch {
        return null;
    }
}

export async function addGenomeFavorite(id: string, actorId: string): Promise<{ genome: GenomeRecord; favorite: GenomeFavoriteRecord; created: boolean }> {
    const res = await fetch(`${BASE}/genomes/id/${encodeURIComponent(id)}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId }),
    });
    if (!res.ok) throw new Error(`Genome Hub error: ${res.status}`);
    return res.json() as Promise<{ genome: GenomeRecord; favorite: GenomeFavoriteRecord; created: boolean }>;
}

export async function removeGenomeFavorite(id: string, actorId: string): Promise<{ genome: GenomeRecord; removed: boolean }> {
    const res = await fetch(`${BASE}/genomes/id/${encodeURIComponent(id)}/favorite/${encodeURIComponent(actorId)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Genome Hub error: ${res.status}`);
    return res.json() as Promise<{ genome: GenomeRecord; removed: boolean }>;
}

/** Fetch a genome by its immutable UUID. Returns null if not found. */
export async function fetchGenomeById(id: string): Promise<GenomeRecord | null> {
    try {
        const res = await fetch(`${BASE}/genomes/id/${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const data = await res.json() as { genome?: GenomeRecord };
        return data.genome ?? null;
    } catch {
        return null;
    }
}

// ── Evolution: diff chain + seed ───────────────────────────────────

/** view-diff: Get the ordered diff chain for a genome (evolution history). */
export async function fetchGenomeDiffs(namespace: string, name: string): Promise<AgentPlugRecord[]> {
    try {
        const encodedNs = encodeURIComponent(namespace);
        const resolvedName = resolveCanonicalGenomeName(namespace, name);
        const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}/diffs`);
        if (!res.ok) return [];
        const data = await res.json() as { diffs: AgentPlugRecord[] };
        return data.diffs ?? [];
    } catch {
        return [];
    }
}

export const fetchAgentPlugs = fetchGenomeDiffs;

/** view-not-diff: Get the original seed spec. */
export async function fetchGenomeSeed(namespace: string, name: string): Promise<string | null> {
    try {
        const encodedNs = encodeURIComponent(namespace);
        const resolvedName = resolveCanonicalGenomeName(namespace, name);
        const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}/seed`);
        if (!res.ok) return null;
        const data = await res.json() as { seed: string };
        return data.seed ?? null;
    } catch {
        return null;
    }
}

export async function fetchGenomeLedger(
    namespace: string,
    name: string,
    version?: number,
): Promise<{ ledger: DiffLedgerEntry[]; replayedSpec: string | null }> {
    try {
        const encodedNs = encodeURIComponent(namespace);
        const resolvedName = resolveCanonicalGenomeName(namespace, name);
        const params = new URLSearchParams();
        if (typeof version === 'number' && Number.isFinite(version)) {
            params.set('version', String(version));
        }
        const query = params.toString();
        const res = await fetch(
            `${BASE}/genomes/${encodedNs}/${encodeURIComponent(resolvedName)}/ledger${query ? `?${query}` : ''}`,
        );
        if (!res.ok) {
            return { ledger: [], replayedSpec: null };
        }
        const data = await res.json() as { ledger?: DiffLedgerEntry[]; replayedSpec?: string | null };
        return {
            ledger: data.ledger ?? [],
            replayedSpec: data.replayedSpec ?? null,
        };
    } catch {
        return { ledger: [], replayedSpec: null };
    }
}
