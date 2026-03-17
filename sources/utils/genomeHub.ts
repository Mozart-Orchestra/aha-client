/**
 * Genome Hub API client — talks to the standalone marketplace server.
 * Base URL defaults to EXPO_PUBLIC_GENOME_HUB_URL or localhost:3006.
 */

const BASE = (process.env.EXPO_PUBLIC_GENOME_HUB_URL ?? 'http://localhost:3006').replace(/\/$/, '');

export interface GenomeFeedback {
    evaluationCount: number;
    avgScore: number;
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
    status: 'draft' | 'verified' | 'official';
    description: string | null;
    spec: string;
    tags: string | null;
    category: string | null;
    isPublic: boolean;
    spawnCount: number;
    feedbackData: string | null;
    publisherId: string | null;
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
    baseRoleId?: string;

    // Tier 1 — Prompt (capabilities only, NOT raw systemPrompt)
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
