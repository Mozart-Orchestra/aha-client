import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenStorage, AuthCredentials, clearLegacyStoredSecretForMigration, shouldReloadForWebAuthSyncEvent, subscribeToWebAuthSync } from '@/auth/tokenStorage';
import { syncCreate, syncReinitialize } from '@/sync/sync';
import * as Updates from 'expo-updates';
import { clearPersistence } from '@/sync/persistence';
import { Platform } from 'react-native';
import { trackLogout } from '@/track';
import { bootstrapRecoveryMaterial, signOutSupabase } from '@/auth/supabaseAuth';
import { fetchInvitationStatus } from '@/auth/invitationStatus';
import { invalidateHubToken } from '@/utils/hubToken';

/** null = unknown yet (still loading), true/false = server answer */
export type InvitationState = boolean | null;

interface AuthContextType {
    isAuthenticated: boolean;
    credentials: AuthCredentials | null;
    invitationVerified: InvitationState;
    login: (token: string, secret: string, invitationVerified?: InvitationState) => Promise<void>;
    logout: () => Promise<void>;
    refreshInvitationStatus: () => Promise<void>;
    markInvitationVerified: () => void;
}

export type RestoreReason = 'restore_required' | 'secret_mismatch' | 'recovery_not_ready';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialCredentials }: { children: ReactNode; initialCredentials: AuthCredentials | null }) {
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialCredentials);
    const [credentials, setCredentials] = useState<AuthCredentials | null>(initialCredentials);
    const [invitationVerified, setInvitationVerified] = useState<InvitationState>(null);
    const bootstrappedRecoveryRef = React.useRef<string | null>(null);
    const credentialsRef = React.useRef<AuthCredentials | null>(initialCredentials);

    // Update global auth state when local state changes
    useEffect(() => {
        setCurrentAuth(credentials
            ? { isAuthenticated, credentials, invitationVerified, login, logout, refreshInvitationStatus, markInvitationVerified }
            : null);
        credentialsRef.current = credentials;
    }, [isAuthenticated, credentials, invitationVerified]);

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

    const login = async (token: string, secret: string, invitationHint?: InvitationState) => {
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

            // Seed invitation state from the login response when the server told us;
            // otherwise leave it unknown so the gate refresh picks it up.
            if (invitationHint !== undefined) {
                setInvitationVerified(invitationHint);
            } else {
                setInvitationVerified(null);
            }
            // Force-refresh from source of truth once we have a token to carry.
            // Errors are caught here to prevent unhandled rejections; the internal
            // function already sets invitationVerified=false on failure.
            refreshInvitationStatusInternal(token).catch(() => { /* state already set to false */ });
        } else {
            throw new Error('Failed to save credentials');
        }
    };

    const refreshInvitationStatusInternal = async (token: string) => {
        try {
            const status = await fetchInvitationStatus(token);
            setInvitationVerified(status.verified);
        } catch {
            // Server unreachable — keep current state instead of forcing
            // the user back to the invitation screen on transient failures.
        }
    };

    const refreshInvitationStatus = async () => {
        const token = credentialsRef.current?.token;
        if (!token) return;
        await refreshInvitationStatusInternal(token);
    };

    const markInvitationVerified = () => {
        setInvitationVerified(true);
    };

    // When credentials rehydrate from storage at app boot, check server state.
    useEffect(() => {
        const token = credentials?.token;
        if (!token) {
            setInvitationVerified(null);
            return;
        }
        if (invitationVerified === null) {
            refreshInvitationStatusInternal(token).catch(() => { /* state already set to false */ });
        }
    }, [credentials?.token]);

    const logout = async () => {
        trackLogout();
        clearPersistence();
        invalidateHubToken();
        await TokenStorage.removeCredentials();
        await signOutSupabase();

        // Update React state to ensure UI consistency
        setCredentials(null);
        setIsAuthenticated(false);
        setInvitationVerified(null);

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
                invitationVerified,
                login,
                logout,
                refreshInvitationStatus,
                markInvitationVerified,
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
