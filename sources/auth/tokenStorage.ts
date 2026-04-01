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
    | { type: 'login'; credentials: AuthCredentials; timestamp: number }
    | { type: 'logout'; timestamp: number };

/**
 * Web storage using localStorage so credentials survive browser restarts.
 * The secret is the permanent account identity and must not be lost on tab close.
 */
const WebStorage = {
    getItem(key: string): string | null {
        return localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
        localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
        localStorage.removeItem(key);
    }
};

// Separate key that persists the secret across logouts, so Google re-login
// can reuse the same secret instead of generating a new one.
const AUTH_SECRET_REAUTH_KEY = 'auth_secret_v1';

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

    const json = JSON.stringify(credentials);
    WebStorage.setItem(AUTH_KEY, json);
    credentialsCache = json;
}

export function clearExternalWebCredentials(): void {
    if (Platform.OS !== 'web') {
        return;
    }

    WebStorage.removeItem(AUTH_KEY);
    credentialsCache = null;
}

/**
 * Returns the permanently stored secret for re-authentication (web only).
 * This survives logout so Google re-login can reuse the same secret.
 */
export function getStoredSecretForReauth(): string | null {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
        return null;
    }
    return localStorage.getItem(AUTH_SECRET_REAUTH_KEY);
}

export const TokenStorage = {
    async getCredentials(): Promise<AuthCredentials | null> {
        if (Platform.OS === 'web') {
            const stored = WebStorage.getItem(AUTH_KEY);
            if (!stored) return null;
            try {
                return JSON.parse(stored) as AuthCredentials;
            } catch (error) {
                console.error('Error parsing web credentials:', error);
                WebStorage.removeItem(AUTH_KEY);
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
                // Persist secret permanently so Google re-login can reuse it
                localStorage.setItem(AUTH_SECRET_REAUTH_KEY, credentials.secret);
                broadcastWebAuthSyncEvent({
                    type: 'login',
                    credentials,
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
            localStorage.removeItem(AUTH_SECRET_REAUTH_KEY);
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
     * Clears the session token but preserves the secret (account identity).
     * Use this for logout — the secret is kept so the next Google/email login
     * can reuse it and avoid generating a new identity that would invalidate
     * existing CLI machines and backup keys.
     */
    async clearToken(): Promise<boolean> {
        if (Platform.OS === 'web') {
            clearExternalWebCredentials();
            broadcastWebAuthSyncEvent({
                type: 'logout',
                timestamp: Date.now(),
            });
            return true;
        }
        try {
            // On native, SecureStore persists across restarts, so simply remove
            // the full credentials. The user will re-authenticate via QR/backup key.
            await SecureStore.deleteItemAsync(AUTH_KEY);
            credentialsCache = null;
            return true;
        } catch (error) {
            console.error('Error clearing token:', error);
            return false;
        }
    },
};
