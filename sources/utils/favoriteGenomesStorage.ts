import { MMKV } from 'react-native-mmkv';

import {
    type FavoriteGenomeStorage,
    loadFavoriteGenomeIds,
    toggleFavoriteGenomeId,
} from './favoriteGenomes';

const storage = new MMKV();

const favoriteGenomeStorage: FavoriteGenomeStorage = {
    getString(key: string) {
        return storage.getString(key);
    },
    set(key: string, value: string) {
        storage.set(key, value);
    },
};

export function loadFavoriteGenomeIdsFromStorage(): string[] {
    return loadFavoriteGenomeIds(favoriteGenomeStorage);
}

export function toggleFavoriteGenomeIdInStorage(genomeId: string): string[] {
    return toggleFavoriteGenomeId(genomeId, favoriteGenomeStorage);
}
