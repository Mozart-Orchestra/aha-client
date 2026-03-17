import { describe, expect, it } from 'vitest';

import {
    isFavoriteGenomeId,
    loadFavoriteGenomeIds,
    parseFavoriteGenomeIds,
    saveFavoriteGenomeIds,
    toggleFavoriteGenomeId,
} from './favoriteGenomes';

function createMemoryStorage(initial?: Record<string, string>) {
    const data = new Map(Object.entries(initial ?? {}));

    return {
        getString(key: string) {
            return data.get(key);
        },
        set(key: string, value: string) {
            data.set(key, value);
        },
    };
}

describe('favoriteGenomes', () => {
    it('parses valid stored IDs and normalizes duplicates', () => {
        expect(parseFavoriteGenomeIds('["g2","g1","g2"]')).toEqual(['g1', 'g2']);
    });

    it('returns an empty list for malformed storage', () => {
        expect(parseFavoriteGenomeIds('not-json')).toEqual([]);
    });

    it('loads and saves favorite genome ids through storage', () => {
        const storage = createMemoryStorage();

        expect(loadFavoriteGenomeIds(storage)).toEqual([]);
        expect(saveFavoriteGenomeIds(['g3', 'g1', 'g1'], storage)).toEqual(['g1', 'g3']);
        expect(loadFavoriteGenomeIds(storage)).toEqual(['g1', 'g3']);
    });

    it('toggles genome ids on and off', () => {
        const storage = createMemoryStorage();

        expect(toggleFavoriteGenomeId('g1', storage)).toEqual(['g1']);
        expect(toggleFavoriteGenomeId('g2', storage)).toEqual(['g1', 'g2']);
        expect(toggleFavoriteGenomeId('g1', storage)).toEqual(['g2']);
    });

    it('checks favorite membership against loaded ids', () => {
        expect(isFavoriteGenomeId('g2', ['g1', 'g2'])).toBe(true);
        expect(isFavoriteGenomeId('g3', ['g1', 'g2'])).toBe(false);
    });
});
