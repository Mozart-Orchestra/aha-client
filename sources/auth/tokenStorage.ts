import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_KEY = 'auth_credentials';
const AUTH_SYNC_EVENT_KEY = 'auth_credentials_sync';

// Cache for synchronous access
let credentialsCache: string | null = null;

export interface AuthCredentials {
    token: string;
    secret: string;
}

export type WebAuthSyncEvent =
    | { type: 'login'; timestamp: number }
    | { type: 'logout'; timestamp: number };

function broadcastWebAuthSyncEvent(event: WebAuthSyncEvent): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(AUTH_SYNC_EVENT_KEY, JSON.stringify(event));
    } catch (error) {
        console.warn('Failed to broadcast auth sync event:', error);
    }
}

export function subscribeToWebAuthSync(listener: (event: WebAuthSyncEvent) => void): () => void {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return () => { /* noop */ };
    }

    const handleStorage = (event: StorageEvent) => {
        if (event.key !== AUTH_SYNC_EVENT_KEY || !event.newValue) {
            return;
        }

        try {
            listener(JSON.parse(event.newValue) as WebAuthSyncEvent);
        } catch (error) {
            console.warn('Failed to parse auth sync event:', error);
        }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
}

export function applyExternalWebCredentials(credentials: AuthCredentials): void {
    if (Platform.OS !== 'web') {
        return;
    }

    credentialsCache = JSON.stringify(credentials);
}

export function clearExternalWebCredentials(): void {
    if (Platform.OS !== 'web') {
        return;
    }

    credentialsCache = null;
}

export const TokenStorage = {
    async getCredentials(): Promise<AuthCredentials | null> {
        if (Platform.OS === 'web') {
            const stored = credentialsCache;
            if (!stored) return null;
            try {
                return JSON.parse(stored) as AuthCredentials;
            } catch (error) {
                console.error('Error parsing web credentials:', error);
                credentialsCache = null;
                return null;
            }
        }
        try {
            const stored = await SecureStore.getItemAsync(AUTH_KEY);
            if (!stored) return null;
            credentialsCache = stored; // Update cache
            return JSON.parse(stored) as AuthCredentials;
        } catch (error) {
            console.error('Error getting credentials:', error);
            return null;
        }
    },

    async setCredentials(credentials: AuthCredentials): Promise<boolean> {
        if (Platform.OS === 'web') {
            try {
                applyExternalWebCredentials(credentials);
                broadcastWebAuthSyncEvent({
                    type: 'login',
                    timestamp: Date.now(),
                });
                return true;
            } catch (error) {
                console.error('Error setting web credentials:', error);
                return false;
            }
        }
        try {
            const json = JSON.stringify(credentials);
            await SecureStore.setItemAsync(AUTH_KEY, json);
            credentialsCache = json; // Update cache
            return true;
        } catch (error) {
            console.error('Error setting credentials:', error);
            return false;
        }
    },

    async removeCredentials(): Promise<boolean> {
        if (Platform.OS === 'web') {
            clearExternalWebCredentials();
            broadcastWebAuthSyncEvent({
                type: 'logout',
                timestamp: Date.now(),
            });
            return true;
        }
        try {
            await SecureStore.deleteItemAsync(AUTH_KEY);
            credentialsCache = null; // Clear cache
            return true;
        } catch (error) {
            console.error('Error removing credentials:', error);
            return false;
        }
    },

    /**
     * Deprecated compatibility wrapper.
     * Web no longer preserves the secret across logout; use removeCredentials().
     */
    async clearToken(): Promise<boolean> {
        return this.removeCredentials();
    },
};
