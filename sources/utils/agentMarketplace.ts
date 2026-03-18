import type { AuthCredentials } from '@/auth/tokenStorage';
import type { Genome as PrivateGenome } from '@/sync/apiEvolution';

import { isFavoriteGenomeId } from './favoriteGenomes';
import { fetchGenomeById, parseSpec, parseTags, type GenomeRecord } from './genomeHub';

export type MarketplacePageTab = 'agents' | 'corps';
export type MarketplaceSourceTab = 'market' | 'favorites' | 'mine';

export const AGENT_MARKETPLACE_CATEGORIES = ['all', 'coordination', 'support', 'execution'] as const;
export type AgentMarketplaceCategory = typeof AGENT_MARKETPLACE_CATEGORIES[number];

const STATUS_PRIORITY: Record<GenomeRecord['status'], number> = {
    official: 0,
    verified: 1,
    unverified: 2,
    draft: 3,
    archived: 4,
};

export function toGenomeRecordFromPrivateGenome(genome: PrivateGenome): GenomeRecord {
    return {
        id: genome.id,
        namespace: genome.namespace ?? '@private',
        name: genome.name,
        version: genome.version ?? 1,
        status: genome.namespace === '@official' ? 'official' : (genome.status ?? 'draft'),
        description: genome.description,
        spec: genome.spec,
        tags: genome.tags ?? null,
        category: genome.category ?? null,
        isPublic: genome.isPublic,
        spawnCount: genome.spawnCount,
        downloadCount: 0,
        starCount: 0,
        feedbackData: genome.feedbackData ?? null,
        lifecycle: null,
        publisherId: genome.accountId,
        parentId: null,
        createdAt: genome.createdAt,
        updatedAt: genome.updatedAt,
    };
}

export function mapOwnedPrivateGenomesToRecords(genomes: PrivateGenome[], profileId: string | null | undefined): GenomeRecord[] {
    return genomes
        .filter((genome) => profileId ? genome.accountId === profileId : true)
        .map(toGenomeRecordFromPrivateGenome);
}

export function sortGenomesForDisplay(genomes: GenomeRecord[], favoriteGenomeIds: string[]): GenomeRecord[] {
    return [...genomes].sort((left, right) => {
        const favoriteDelta = Number(isFavoriteGenomeId(right.id, favoriteGenomeIds)) - Number(isFavoriteGenomeId(left.id, favoriteGenomeIds));
        if (favoriteDelta !== 0) {
            return favoriteDelta;
        }

        const statusDelta = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
        if (statusDelta !== 0) {
            return statusDelta;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
    });
}

function matchesMarketplaceTab(genome: GenomeRecord, tab: MarketplacePageTab): boolean {
    const isCorps = genome.category === 'corps';
    return tab === 'corps' ? isCorps : !isCorps;
}

function matchesCategory(genome: GenomeRecord, category: AgentMarketplaceCategory): boolean {
    if (category === 'all') {
        return true;
    }

    return genome.category === category;
}

function matchesQuery(genome: GenomeRecord, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    const spec = parseSpec(genome.spec);

    const haystack = [
        genome.name,
        genome.description ?? '',
        genome.namespace ?? '',
        genome.category ?? '',
        ...parseTags(genome.tags),
        spec?.runtimeType ?? '',
        spec?.preferredModel ?? '',
        ...(spec?.resume?.specialties ?? []),
        ...(spec?.operations?.commonPatterns ?? []),
        ...Object.keys(spec?.modelScores ?? {}),
    ]
        .join('\n')
        .toLowerCase();

    return haystack.includes(normalizedQuery);
}

export function filterPrivateMarketplaceGenomes(
    genomes: GenomeRecord[],
    filters: {
        tab: MarketplacePageTab;
        category: AgentMarketplaceCategory;
        query: string;
    }
): GenomeRecord[] {
    return genomes.filter((genome) => {
        if (!matchesMarketplaceTab(genome, filters.tab)) {
            return false;
        }

        if (filters.tab !== 'corps' && !matchesCategory(genome, filters.category)) {
            return false;
        }

        return matchesQuery(genome, filters.query);
    });
}

function filterPublicMarketplaceGenomes(
    genomes: GenomeRecord[],
    filters: {
        tab: MarketplacePageTab;
        category: AgentMarketplaceCategory;
        query: string;
    }
): GenomeRecord[] {
    return genomes.filter((genome) => {
        if (!matchesMarketplaceTab(genome, filters.tab)) {
            return false;
        }

        if (filters.tab !== 'corps' && !matchesCategory(genome, filters.category)) {
            return false;
        }

        return matchesQuery(genome, filters.query);
    });
}

function mergeGenomeRecords(genomes: GenomeRecord[]): GenomeRecord[] {
    const byId = new Map<string, GenomeRecord>();

    genomes.forEach((genome) => {
        byId.set(genome.id, genome);
    });

    return Array.from(byId.values());
}

export function selectMarketplaceGenomes(params: {
    sourceTab: MarketplaceSourceTab;
    publicGenomes: GenomeRecord[];
    privateGenomes: GenomeRecord[];
    favoriteGenomeIds: string[];
    tab: MarketplacePageTab;
    category: AgentMarketplaceCategory;
    query: string;
}): GenomeRecord[] {
    const filteredPublic = filterPublicMarketplaceGenomes(params.publicGenomes, {
        tab: params.tab,
        category: params.category,
        query: params.query,
    });
    const filteredPrivate = filterPrivateMarketplaceGenomes(params.privateGenomes, {
        tab: params.tab,
        category: params.category,
        query: params.query,
    });

    if (params.sourceTab === 'mine') {
        return filteredPrivate;
    }

    if (params.sourceTab === 'favorites') {
        return mergeGenomeRecords([...filteredPublic, ...filteredPrivate])
            .filter((genome) => isFavoriteGenomeId(genome.id, params.favoriteGenomeIds));
    }

    return filteredPublic;
}

export async function fetchAccessibleGenomeById(
    id: string,
    options?: {
        credentials?: AuthCredentials | null;
        pageSize?: number;
        fetchPublicGenomeById?: (genomeId: string) => Promise<GenomeRecord | null>;
        fetchPrivateGenomesPage?: (
            credentials: AuthCredentials,
            params: { limit?: number; offset?: number }
        ) => Promise<{ genomes: PrivateGenome[]; total: number }>;
    }
): Promise<GenomeRecord | null> {
    const publicGenome = await (options?.fetchPublicGenomeById ?? fetchGenomeById)(id);
    if (publicGenome) {
        return publicGenome;
    }

    const credentials = options?.credentials;
    if (!credentials) {
        return null;
    }

    const fetchPrivateGenomesPage = options?.fetchPrivateGenomesPage
        ?? (await import('@/sync/apiEvolution')).fetchGenomes;
    const pageSize = options?.pageSize ?? 100;
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
        const result = await fetchPrivateGenomesPage(credentials, { limit: pageSize, offset });
        const found = result.genomes.find((genome) => genome.id === id);
        if (found) {
            return toGenomeRecordFromPrivateGenome(found);
        }

        total = result.total;
        if (result.genomes.length === 0) {
            break;
        }

        offset += result.genomes.length;
    }

    return null;
}
