export type FavoriteGenomeStorage = {
    getString(key: string): string | undefined;
    set(key: string, value: string): void;
};

export const FAVORITE_GENOME_IDS_KEY = 'favorite-genome-ids';

function uniqueSorted(ids: string[]): string[] {
    return Array.from(new Set(ids.filter(Boolean))).sort();
}

export function parseFavoriteGenomeIds(raw: string | undefined): string[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? uniqueSorted(parsed.filter((value): value is string => typeof value === 'string')) : [];
    } catch {
        return [];
    }
}

export function loadFavoriteGenomeIds(storage: FavoriteGenomeStorage): string[] {
    return parseFavoriteGenomeIds(storage.getString(FAVORITE_GENOME_IDS_KEY));
}

export function saveFavoriteGenomeIds(ids: string[], storage: FavoriteGenomeStorage): string[] {
    const normalized = uniqueSorted(ids);
    storage.set(FAVORITE_GENOME_IDS_KEY, JSON.stringify(normalized));
    return normalized;
}

export function toggleFavoriteGenomeId(genomeId: string, storage: FavoriteGenomeStorage): string[] {
    const current = loadFavoriteGenomeIds(storage);
    if (current.includes(genomeId)) {
        return saveFavoriteGenomeIds(current.filter((id) => id !== genomeId), storage);
    }

    return saveFavoriteGenomeIds([...current, genomeId], storage);
}

export function isFavoriteGenomeId(genomeId: string, favoriteGenomeIds: string[]): boolean {
    return favoriteGenomeIds.includes(genomeId);
}
