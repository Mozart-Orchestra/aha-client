import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeGenome(name: string, namespace = '@official') {
    return {
        id: `genome-${name}`,
        namespace,
        name,
        version: 1,
        status: 'official' as const,
        description: null,
        spec: '{}',
        tags: null,
        category: null,
        isPublic: namespace === '@official',
        spawnCount: 0,
        downloadCount: 0,
        starCount: 0,
        feedbackData: null,
        publisherId: null,
        parentId: null,
        lifecycle: null,
        createdAt: '2026-03-29T00:00:00.000Z',
        updatedAt: '2026-03-29T00:00:00.000Z',
    };
}

describe('genomeHub role alias lookup', () => {
    const originalGenomeHubUrl = process.env.EXPO_PUBLIC_GENOME_HUB_URL;

    beforeEach(() => {
        process.env.EXPO_PUBLIC_GENOME_HUB_URL = 'http://genome-hub.test';
        vi.resetModules();
    });

    afterEach(() => {
        if (originalGenomeHubUrl === undefined) {
            delete process.env.EXPO_PUBLIC_GENOME_HUB_URL;
        } else {
            process.env.EXPO_PUBLIC_GENOME_HUB_URL = originalGenomeHubUrl;
        }
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('maps legacy official builder lookups to implementer', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ genome: makeGenome('implementer') }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { fetchGenomeByName } = await import('./genomeHub');
        const genome = await fetchGenomeByName('@official', 'builder');

        expect(fetchMock).toHaveBeenCalledWith('http://genome-hub.test/genomes/%40official/implementer');
        expect(genome?.name).toBe('implementer');
    });

    it('preserves non-official names instead of lowercasing them', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ genome: makeGenome('MyPrivateBuilder', '@private') }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { fetchGenomeByName } = await import('./genomeHub');
        const genome = await fetchGenomeByName('@private', 'MyPrivateBuilder');

        expect(fetchMock).toHaveBeenCalledWith('http://genome-hub.test/genomes/%40private/MyPrivateBuilder');
        expect(genome?.namespace).toBe('@private');
        expect(genome?.name).toBe('MyPrivateBuilder');
    });
});
