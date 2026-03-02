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
 * Web storage using sessionStorage only for better security.
 * Note: For production web apps, consider using HttpOnly cookies
 * or a more secure storage mechanism to protect against XSS attacks.
 */
const WebStorage = {
    getItem(key: string): string | null {
        // Use sessionStorage only (cleared on tab close)
        return sessionStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
        // Store in sessionStorage only for security
        sessionStorage.setItem(key, value);
    },
    removeItem(key: string): void {
        sessionStorage.removeItem(key);
    }
};

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
                WebStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
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
