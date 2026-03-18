/**
 * Genome Hub API client — talks to the standalone marketplace server.
 * Base URL defaults to EXPO_PUBLIC_GENOME_HUB_URL or localhost:3006.
 */

const BASE = (process.env.EXPO_PUBLIC_GENOME_HUB_URL ?? 'http://localhost:3006').replace(/\/$/, '');

export interface GenomeFeedback {
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
    namespace: string | null;
    name: string;
    version: number;
    status: 'draft' | 'unverified' | 'verified' | 'official' | 'archived';
    description: string | null;
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
    lifecycle: 'experimental' | 'active' | 'deprecated' | null;
    createdAt: string;
    updatedAt: string;
}

export function parseFeedback(feedbackData: string | null): GenomeFeedback | null {
    if (!feedbackData) return null;
    try {
        return JSON.parse(feedbackData) as GenomeFeedback;
    } catch {
        return null;
    }
}

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
    try {
        const encodedNs = encodeURIComponent(namespace);
        const res = await fetch(`${BASE}/genomes/${encodedNs}/${encodeURIComponent(name)}`);
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

export interface CorpsSpec {
    namespace: string;
    name: string;
    version: number;
    description: string;
    tags?: string[];
    category?: string;
    members: {
        genome: string;
        roleAlias?: string;
        count?: number;
        required?: boolean;
    }[];
    bootContext?: {
        teamDescription?: string;
        initialObjective?: string;
    };
}

export function parseCorpsSpec(specJson: string): CorpsSpec | null {
    try {
        return JSON.parse(specJson) as CorpsSpec;
    } catch {
        return null;
    }
}

// ─── GenomeSpec (display-only subset of the canonical spec) ─────────────────

export interface GenomeSpec {
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

export function parseSpec(specJson: string): GenomeSpec | null {
    try {
        return JSON.parse(specJson) as GenomeSpec;
    } catch {
        return null;
    }
}

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
