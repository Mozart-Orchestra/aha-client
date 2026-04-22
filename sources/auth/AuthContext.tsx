import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { AuthCredentials, subscribeToWebAuthSync, shouldReloadForWebAuthSyncEvent } from '@/auth/tokenStorage';
import { clearPersistence } from '@/sync/persistence';
import { authOrchestrator, AuthState } from '@/auth/authOrchestrator';

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

function stateToContextValues(state: AuthState): Pick<AuthContextType, 'isAuthenticated' | 'credentials' | 'invitationVerified'> {
    switch (state.status) {
        case 'authenticated':
            return {
                isAuthenticated: true,
                credentials: state.credentials,
                invitationVerified: state.invitationVerified,
            };
        case 'idle':
        case 'authenticating':
        case 'logging_out':
        case 'error':
        default:
            return {
                isAuthenticated: false,
                credentials: null,
                invitationVerified: null,
            };
    }
}

export function AuthProvider({ children, initialCredentials }: { children: ReactNode; initialCredentials: AuthCredentials | null }) {
    const [state, setState] = useState<AuthState>(
        initialCredentials
            ? { status: 'authenticated', credentials: initialCredentials, invitationVerified: initialCredentials.invitationVerified === true }
            : { status: 'idle' },
    );

    // Subscribe to orchestrator state changes
    useEffect(() => {
        const unsubscribe = authOrchestrator.subscribe((nextState) => {
            setState(nextState);
        });

        // Trigger rehydration if no initial credentials were provided
        if (!initialCredentials) {
            void authOrchestrator.rehydrate();
        }

        return unsubscribe;
    }, [initialCredentials]);

    // Web multi-tab auth sync: reload when another tab logs in/out with different credentials
    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        return subscribeToWebAuthSync((event) => {
            void (async () => {
                const credentials = state.status === 'authenticated' ? state.credentials : null;
                const shouldReload = await shouldReloadForWebAuthSyncEvent(credentials, event);
                if (!shouldReload) {
                    return;
                }

                clearPersistence();
                window.location.reload();
            })();
        });
    }, [state]);

    // Keep non-React contexts in sync
    useEffect(() => {
        const values = stateToContextValues(state);
        setCurrentAuth({
            ...values,
            login,
            logout,
            refreshInvitationStatus,
            markInvitationVerified,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    const login = useCallback(async (token: string, secret: string, invitationVerified?: InvitationState) => {
        const invitationHint = invitationVerified === null ? null : invitationVerified;
        await authOrchestrator.login(token, secret, invitationHint);
    }, []);

    const logout = useCallback(async () => {
        await authOrchestrator.logout();
    }, []);

    const refreshInvitationStatus = useCallback(async () => {
        await authOrchestrator.refreshInvitationStatus();
    }, []);

    const markInvitationVerified = useCallback(() => {
        authOrchestrator.markInvitationVerified();
    }, []);

    const contextValue: AuthContextType = {
        ...stateToContextValues(state),
        login,
        logout,
        refreshInvitationStatus,
        markInvitationVerified,
    };

    return (
        <AuthContext.Provider value={contextValue}>
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
