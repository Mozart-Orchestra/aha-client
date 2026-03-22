import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenStorage, AuthCredentials, subscribeToWebAuthSync, applyExternalWebCredentials, clearExternalWebCredentials } from '@/auth/tokenStorage';
import { autoDownloadRestoreKeyBackup } from '@/auth/restoreKeyDownload';
import { syncCreate, syncReinitialize } from '@/sync/sync';
import * as Updates from 'expo-updates';
import { clearPersistence } from '@/sync/persistence';
import { Platform } from 'react-native';
import { trackLogout } from '@/track';

interface AuthContextType {
    isAuthenticated: boolean;
    credentials: AuthCredentials | null;
    login: (token: string, secret: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isSameCredentials(a: AuthCredentials | null, b: AuthCredentials | null): boolean {
    if (!a || !b) {
        return a === b;
    }

    return a.token === b.token && a.secret === b.secret;
}


export function AuthProvider({ children, initialCredentials }: { children: ReactNode; initialCredentials: AuthCredentials | null }) {
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialCredentials);
    const [credentials, setCredentials] = useState<AuthCredentials | null>(initialCredentials);
    const downloadedSecretRef = React.useRef<string | null>(null);

    // Update global auth state when local state changes
    useEffect(() => {
        setCurrentAuth(credentials ? { isAuthenticated, credentials, login, logout } : null);
    }, [isAuthenticated, credentials]);

    useEffect(() => {
        const secret = credentials?.secret;
        if (!secret || downloadedSecretRef.current === secret) {
            return;
        }

        downloadedSecretRef.current = secret;
        autoDownloadRestoreKeyBackup(secret).catch((error) => {
            console.warn('Failed to auto-download restore key backup:', error);
        });
    }, [credentials?.secret]);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        return subscribeToWebAuthSync((event) => {
            if (event.type === 'login') {
                if (isSameCredentials(credentials, event.credentials)) {
                    return;
                }

                applyExternalWebCredentials(event.credentials);
                clearPersistence();
                setCredentials(event.credentials);
                setIsAuthenticated(true);
                window.location.reload();
                return;
            }

            if (!credentials) {
                return;
            }

            clearExternalWebCredentials();
            clearPersistence();
            setCredentials(null);
            setIsAuthenticated(false);
            window.location.reload();
        });
    }, [credentials]);

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
        } else {
            throw new Error('Failed to save credentials');
        }
    };

    const logout = async () => {
        trackLogout();
        clearPersistence();
        await TokenStorage.removeCredentials();
        
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
                console.log('Reload failed (expected in dev mode):', error);
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
