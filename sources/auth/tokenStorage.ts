import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_KEY = 'auth_credentials';

// Cache for synchronous access
let credentialsCache: string | null = null;

export interface AuthCredentials {
    token: string;
    secret: string;
}

/**
 * Web storage with sessionStorage fallback for better security.
 * Note: For production web apps, consider using HttpOnly cookies
 * or a more secure storage mechanism to protect against XSS attacks.
 */
const WebStorage = {
    getItem(key: string): string | null {
        // Use sessionStorage for better security (cleared on tab close)
        // Falls back to localStorage for persistence if needed
        return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
        // Store in sessionStorage for security
        sessionStorage.setItem(key, value);
        // Also store in localStorage for persistence across tabs
        // but clear it on explicit logout
        localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    }
};

export const TokenStorage = {
    async getCredentials(): Promise<AuthCredentials | null> {
        if (Platform.OS === 'web') {
            const stored = WebStorage.getItem(AUTH_KEY);
            return stored ? JSON.parse(stored) as AuthCredentials : null;
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
            WebStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
            return true;
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
            WebStorage.removeItem(AUTH_KEY);
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
};
