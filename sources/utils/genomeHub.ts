/**
 * Genome Hub API client — talks to the standalone marketplace server.
 * Base URL defaults to EXPO_PUBLIC_GENOME_HUB_URL or localhost:3006.
 */

const BASE = (process.env.EXPO_PUBLIC_GENOME_HUB_URL ?? 'http://localhost:3006').replace(/\/$/, '');

export interface GenomeRecord {
    id: string;
    namespace: string | null;
    name: string;
    version: number;
    description: string | null;
    spec: string;
    tags: string | null;
    category: string | null;
    isPublic: boolean;
    spawnCount: number;
    publisherId: string | null;
    createdAt: string;
    updatedAt: string;
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
