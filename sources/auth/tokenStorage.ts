import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_KEY = 'auth_credentials';
const AUTH_SYNC_EVENT_KEY = 'auth_credentials_sync';
const LEGACY_AUTH_SECRET_REAUTH_KEY = 'auth_secret_v1';

// Cache for synchronous access
let credentialsCache: string | null = null;

export interface AuthCredentials {
    token: string;
    secret: string;
    invitationVerified?: boolean | null;
}

export type WebAuthSyncEvent =
    | { type: 'login'; timestamp: number; secretDigest: string | null }
    | { type: 'logout'; timestamp: number };

async function digestWebAuthSecret(secret: string): Promise<string | null> {
    if (Platform.OS !== 'web' || typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') {
        return null;
    }

    try {
        const encodedSecret = new TextEncoder().encode(secret);
        const digest = await crypto.subtle.digest('SHA-256', encodedSecret);
        return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.warn('Failed to hash web auth secret for sync event:', error);
        return null;
    }
}

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

export async function shouldReloadForWebAuthSyncEvent(
    currentCredentials: AuthCredentials | null,
    event: WebAuthSyncEvent,
): Promise<boolean> {
    if (event.type === 'logout') {
        return currentCredentials !== null;
    }

    if (!currentCredentials) {
        return true;
    }

    if (!event.secretDigest) {
        return true;
    }

    const currentDigest = await digestWebAuthSecret(currentCredentials.secret);
    if (!currentDigest) {
        return true;
    }

    return currentDigest !== event.secretDigest;
}

export function applyExternalWebCredentials(credentials: AuthCredentials): void {
    if (Platform.OS !== 'web') {
        return;
    }

    const serialized = JSON.stringify(credentials);
    credentialsCache = serialized;

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(AUTH_KEY, serialized);
    } catch (error) {
        console.warn('Failed to persist web credentials:', error);
    }
}

export function clearExternalWebCredentials(): void {
    if (Platform.OS !== 'web') {
        return;
    }

    credentialsCache = null;

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(AUTH_KEY);
    } catch (error) {
        console.warn('Failed to clear persisted web credentials:', error);
    }
}

export function clearStoredCredentialsForSupabaseCallback(): boolean {
    if (Platform.OS !== 'web') {
        credentialsCache = null;
        return true;
    }

    try {
        clearExternalWebCredentials();
        broadcastWebAuthSyncEvent({
            type: 'logout',
            timestamp: Date.now(),
        });
        return true;
    } catch (error) {
        console.warn('Failed to clear stored web credentials for Supabase callback:', error);
        return false;
    }
}

export function getLegacyStoredSecretForMigration(): string | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
    }

    return localStorage.getItem(LEGACY_AUTH_SECRET_REAUTH_KEY);
}

export function clearLegacyStoredSecretForMigration(): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    localStorage.removeItem(LEGACY_AUTH_SECRET_REAUTH_KEY);
}

function setLegacyStoredSecretForMigration(secret: string): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }

    localStorage.setItem(LEGACY_AUTH_SECRET_REAUTH_KEY, secret);
}

export const TokenStorage = {
    async getCredentials(): Promise<AuthCredentials | null> {
        if (Platform.OS === 'web') {
            const stored = credentialsCache
                ?? (typeof window !== 'undefined' && typeof localStorage !== 'undefined'
                    ? localStorage.getItem(AUTH_KEY)
                    : null);
            if (!stored) return null;
            try {
                credentialsCache = stored;
                return JSON.parse(stored) as AuthCredentials;
            } catch (error) {
                console.error('Error parsing web credentials:', error);
                clearExternalWebCredentials();
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
                setLegacyStoredSecretForMigration(credentials.secret);
                const secretDigest = await digestWebAuthSecret(credentials.secret);
                broadcastWebAuthSyncEvent({
                    type: 'login',
                    timestamp: Date.now(),
                    secretDigest,
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
            clearLegacyStoredSecretForMigration();
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
     * Alias kept for older callers.
     */
    async clearToken(): Promise<boolean> {
        return this.removeCredentials();
    },
};
