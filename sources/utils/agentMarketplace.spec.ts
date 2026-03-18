import { describe, expect, it, vi } from 'vitest';

import type { AuthCredentials } from '@/auth/tokenStorage';
import type { Genome as PrivateGenome } from '@/sync/apiEvolution';

import type { GenomeRecord } from './genomeHub';
import {
    fetchAccessibleGenomeById,
    filterPrivateMarketplaceGenomes,
    selectMarketplaceGenomes,
    sortGenomesForDisplay,
    toGenomeRecordFromPrivateGenome,
} from './agentMarketplace';

function createGenomeRecord(overrides: Partial<GenomeRecord> & Pick<GenomeRecord, 'id' | 'name'>): GenomeRecord {
    return {
        id: overrides.id,
        namespace: overrides.namespace ?? '@public',
        name: overrides.name,
        version: overrides.version ?? 1,
        status: overrides.status ?? 'draft',
        description: overrides.description ?? null,
        spec: overrides.spec ?? '{}',
        tags: overrides.tags ?? null,
        category: overrides.category ?? null,
        isPublic: overrides.isPublic ?? true,
        spawnCount: overrides.spawnCount ?? 0,
        downloadCount: overrides.downloadCount ?? 0,
        starCount: overrides.starCount ?? 0,
        feedbackData: overrides.feedbackData ?? null,
        lifecycle: overrides.lifecycle ?? null,
        publisherId: overrides.publisherId ?? null,
        parentId: overrides.parentId ?? null,
        createdAt: overrides.createdAt ?? '2026-03-17T00:00:00.000Z',
        updatedAt: overrides.updatedAt ?? '2026-03-17T00:00:00.000Z',
    };
}

function createPrivateGenome(overrides: Partial<PrivateGenome> & Pick<PrivateGenome, 'id' | 'name' | 'accountId'>): PrivateGenome {
    return {
        id: overrides.id,
        accountId: overrides.accountId,
        namespace: overrides.namespace ?? null,
        name: overrides.name,
        version: overrides.version ?? 1,
        description: overrides.description ?? null,
        spec: overrides.spec ?? '{}',
        parentSessionId: overrides.parentSessionId ?? 'session-1',
        teamId: overrides.teamId ?? null,
        tags: overrides.tags ?? null,
        category: overrides.category ?? null,
        spawnCount: overrides.spawnCount ?? 0,
        lastSpawnedAt: overrides.lastSpawnedAt ?? null,
        isPublic: overrides.isPublic ?? false,
        feedbackData: overrides.feedbackData ?? null,
        createdAt: overrides.createdAt ?? '2026-03-17T00:00:00.000Z',
        updatedAt: overrides.updatedAt ?? '2026-03-17T00:00:00.000Z',
    };
}

describe('agentMarketplace', () => {
    it('filters private genomes by tab, category, and query', () => {
        const genomes = [
            createGenomeRecord({
                id: 'g1',
                name: 'Coordinator Alpha',
                category: 'coordination',
                tags: '["planner"]',
                spec: JSON.stringify({ runtimeType: 'codex', resume: { specialties: ['Go review'] } }),
            }),
            createGenomeRecord({ id: 'g2', name: 'Support Beta', category: 'support' }),
            createGenomeRecord({ id: 'g3', name: 'Corps Gamma', category: 'corps' }),
        ];

        expect(filterPrivateMarketplaceGenomes(genomes, {
            tab: 'agents',
            category: 'coordination',
            query: 'planner',
        }).map((genome) => genome.id)).toEqual(['g1']);

        expect(filterPrivateMarketplaceGenomes(genomes, {
            tab: 'corps',
            category: 'all',
            query: '',
        }).map((genome) => genome.id)).toEqual(['g3']);

        expect(filterPrivateMarketplaceGenomes(genomes, {
            tab: 'agents',
            category: 'coordination',
            query: 'go review',
        }).map((genome) => genome.id)).toEqual(['g1']);
    });

    it('selects favorites across public and private sources while preserving filters', () => {
        const publicGenomes = [
            createGenomeRecord({ id: 'public-1', name: 'Market Planner', category: 'coordination' }),
            createGenomeRecord({ id: 'public-2', name: 'Market Support', category: 'support' }),
        ];
        const privateGenomes = [
            createGenomeRecord({ id: 'private-1', name: 'My Planner', category: 'coordination', isPublic: false }),
            createGenomeRecord({ id: 'private-2', name: 'My Corps', category: 'corps', isPublic: false }),
        ];

        const selected = selectMarketplaceGenomes({
            sourceTab: 'favorites',
            publicGenomes,
            privateGenomes,
            favoriteGenomeIds: ['public-1', 'private-1', 'private-2'],
            tab: 'agents',
            category: 'coordination',
            query: 'planner',
        });

        expect(selected.map((genome) => genome.id)).toEqual(['public-1', 'private-1']);
    });

    it('sorts favorites first, then status priority, then recency', () => {
        const genomes = [
            createGenomeRecord({ id: 'draft-new', name: 'Draft New', status: 'draft', updatedAt: '2026-03-18T00:00:00.000Z' }),
            createGenomeRecord({ id: 'official-old', name: 'Official Old', status: 'official', updatedAt: '2026-03-16T00:00:00.000Z' }),
            createGenomeRecord({ id: 'favorite-draft', name: 'Favorite Draft', status: 'draft', updatedAt: '2026-03-15T00:00:00.000Z' }),
        ];

        expect(sortGenomesForDisplay(genomes, ['favorite-draft']).map((genome) => genome.id)).toEqual([
            'favorite-draft',
            'official-old',
            'draft-new',
        ]);
    });

    it('falls back to paginated private genome lookup when the public marketplace misses', async () => {
        const credentials = { token: 'test-token' } as AuthCredentials;
        const privateGenome = createPrivateGenome({
            id: 'private-42',
            name: 'Private Genome',
            accountId: 'user-1',
            category: 'support',
        });
        const fetchPublicGenomeById = vi.fn().mockResolvedValue(null);
        const fetchPrivateGenomesPage = vi
            .fn()
            .mockResolvedValueOnce({
                genomes: [
                    createPrivateGenome({ id: 'private-10', name: 'Other', accountId: 'user-1' }),
                ],
                total: 2,
            })
            .mockResolvedValueOnce({
                genomes: [privateGenome],
                total: 2,
            });

        const result = await fetchAccessibleGenomeById('private-42', {
            credentials,
            pageSize: 1,
            fetchPublicGenomeById,
            fetchPrivateGenomesPage,
        });

        expect(fetchPublicGenomeById).toHaveBeenCalledWith('private-42');
        expect(fetchPrivateGenomesPage).toHaveBeenNthCalledWith(1, credentials, { limit: 1, offset: 0 });
        expect(fetchPrivateGenomesPage).toHaveBeenNthCalledWith(2, credentials, { limit: 1, offset: 1 });
        expect(result).toEqual(toGenomeRecordFromPrivateGenome(privateGenome));
    });
});
