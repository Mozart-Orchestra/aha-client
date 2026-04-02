import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenStorage, AuthCredentials, clearLegacyStoredSecretForMigration, shouldReloadForWebAuthSyncEvent, subscribeToWebAuthSync } from '@/auth/tokenStorage';
import { syncCreate, syncReinitialize } from '@/sync/sync';
import * as Updates from 'expo-updates';
import { clearPersistence } from '@/sync/persistence';
import { Platform } from 'react-native';
import { trackLogout } from '@/track';
import { bootstrapRecoveryMaterial, signOutSupabase } from '@/auth/supabaseAuth';

interface AuthContextType {
    isAuthenticated: boolean;
    credentials: AuthCredentials | null;
    login: (token: string, secret: string) => Promise<void>;
    logout: () => Promise<void>;
}

export type RestoreReason = 'restore_required' | 'secret_mismatch' | 'recovery_not_ready';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialCredentials }: { children: ReactNode; initialCredentials: AuthCredentials | null }) {
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialCredentials);
    const [credentials, setCredentials] = useState<AuthCredentials | null>(initialCredentials);
    const bootstrappedRecoveryRef = React.useRef<string | null>(null);
    const credentialsRef = React.useRef<AuthCredentials | null>(initialCredentials);

    // Update global auth state when local state changes
    useEffect(() => {
        setCurrentAuth(credentials ? { isAuthenticated, credentials, login, logout } : null);
        credentialsRef.current = credentials;
    }, [isAuthenticated, credentials]);

    useEffect(() => {
        if (!credentials?.token || !credentials.secret) {
            return;
        }

        const cacheKey = `${credentials.token}:${credentials.secret}`;
        if (bootstrappedRecoveryRef.current === cacheKey) {
            return;
        }

        bootstrappedRecoveryRef.current = cacheKey;
        bootstrapRecoveryMaterial(credentials.token, credentials.secret).catch((error) => {
            console.warn('Failed to bootstrap account recovery material:', error);
        });
    }, [credentials?.token, credentials?.secret]);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        return subscribeToWebAuthSync((event) => {
            void (async () => {
                const shouldReload = await shouldReloadForWebAuthSyncEvent(credentialsRef.current, event);
                if (!shouldReload) {
                    return;
                }

                clearPersistence();
                setCredentials(null);
                setIsAuthenticated(false);
                window.location.reload();
            })();
        });
    }, []);

    const login = async (token: string, secret: string) => {
        const newCredentials: AuthCredentials = { token, secret };
        const success = await TokenStorage.setCredentials(newCredentials);
        if (success) {
            if (isAuthenticated) {
                // Re-auth: must reinitialize sync with new encryption keys
                await syncReinitialize(newCredentials);
            } else {
                await syncCreate(newCredentials);
            }
            setCredentials(newCredentials);
            setIsAuthenticated(true);
            if (Platform.OS === 'web') {
                clearLegacyStoredSecretForMigration();
            }
        } else {
            throw new Error('Failed to save credentials');
        }
    };

    const logout = async () => {
        trackLogout();
        clearPersistence();
        await TokenStorage.removeCredentials();
        await signOutSupabase();

        // Update React state to ensure UI consistency
        setCredentials(null);
        setIsAuthenticated(false);

        if (Platform.OS === 'web') {
            window.location.reload();
        } else {
            try {
                await Updates.reloadAsync();
            } catch (error) {
                // In dev mode, reloadAsync will throw ERR_UPDATES_DISABLED
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                credentials,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper to get current auth state for non-React contexts
let currentAuthState: AuthContextType | null = null;

export function setCurrentAuth(auth: AuthContextType | null) {
    currentAuthState = auth;
}

export function getCurrentAuth(): AuthContextType | null {
    return currentAuthState;
}

// Flag: Supabase account exists but local secret is missing
let needsRestoreReason: RestoreReason | null = null;

export function setNeedsRestore(value: boolean | RestoreReason | null) {
    if (value === true) {
        needsRestoreReason = 'restore_required';
        return;
    }

    if (value === false) {
        needsRestoreReason = null;
        return;
    }

    needsRestoreReason = value;
}

export function getNeedsRestore(): boolean {
    return needsRestoreReason !== null;
}

export function getNeedsRestoreReason(): RestoreReason | null {
    return needsRestoreReason;
}
