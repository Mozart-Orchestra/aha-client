import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { TokenStorage, AuthCredentials, clearLegacyStoredSecretForMigration } from '@/auth/tokenStorage';
import { syncCreate, syncReinitialize } from '@/sync/sync';
import { clearPersistence } from '@/sync/persistence';
import { trackLogout } from '@/track';
import { invalidateHubToken } from '@/utils/hubToken';
import { bootstrapRecoveryMaterial, signOutSupabase } from '@/auth/supabaseAuth';
import { fetchInvitationStatus } from '@/auth/invitationStatus';
import { isInvitationGateEnabled } from '@/auth/invitationGate';

/** Authentication state machine states */
export type AuthState =
    | { status: 'idle' }
    | { status: 'authenticating' }
    | { status: 'authenticated'; credentials: AuthCredentials; invitationVerified: boolean }
    | { status: 'logging_out' }
    | { status: 'error'; error: Error };

/** Listener type for state changes */
type StateListener = (state: AuthState) => void;

export class AuthOrchestratorImpl {
    private state: AuthState = { status: 'idle' };
    private listeners: Set<StateListener> = new Set();
    private bootstrappedRecoveryKey: string | null = null;

    // ── Public API ──

    getCurrentState(): AuthState {
        return this.state;
    }

    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    async login(token: string, secret: string, invitationHint?: boolean | null): Promise<void> {
        if (this.state.status === 'authenticating' || this.state.status === 'logging_out') {
            throw new Error(`Cannot login while ${this.state.status}`);
        }

        const wasAuthenticated = this.state.status === 'authenticated';
        this.transition({ status: 'authenticating' });

        try {
            const nextInvitationState = isInvitationGateEnabled() ? invitationHint ?? null : true;
            const newCredentials: AuthCredentials = {
                token,
                secret,
                invitationVerified: nextInvitationState ?? undefined,
            };

            const persistSuccess = await TokenStorage.setCredentials(newCredentials);
            if (!persistSuccess) {
                throw new Error('Failed to save credentials');
            }

            if (wasAuthenticated) {
                await syncReinitialize(newCredentials);
            } else {
                await syncCreate(newCredentials);
            }

            if (Platform.OS === 'web') {
                clearLegacyStoredSecretForMigration();
            }

            this.transition({
                status: 'authenticated',
                credentials: newCredentials,
                invitationVerified: nextInvitationState === true,
            });

            // Bootstrap recovery material asynchronously (non-blocking)
            this.scheduleRecoveryBootstrap(token, secret);

            // Refresh invitation status from server if gate is enabled
            if (isInvitationGateEnabled()) {
                this.refreshInvitationStatusAsync(token);
            }
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.transition({ status: 'error', error: normalizedError });
            throw normalizedError;
        }
    }

    async logout(): Promise<void> {
        if (this.state.status === 'logging_out') {
            return;
        }

        this.transition({ status: 'logging_out' });

        trackLogout();
        clearPersistence();
        invalidateHubToken();
        await TokenStorage.removeCredentials();
        await signOutSupabase();

        this.transition({ status: 'idle' });

        if (Platform.OS === 'web') {
            window.location.reload();
        } else {
            try {
                await Updates.reloadAsync();
            } catch {
                // In dev mode, reloadAsync will throw ERR_UPDATES_DISABLED
            }
        }
    }

    async refreshInvitationStatus(): Promise<void> {
        if (!isInvitationGateEnabled()) {
            this.patchInvitationState(true);
            return;
        }

        const token = this.extractToken();
        if (!token) {
            return;
        }

        await this.refreshInvitationStatusAsync(token);
    }

    markInvitationVerified(): void {
        this.patchInvitationState(true);
    }

    /** Rehydrate state from stored credentials (called at app boot) */
    async rehydrate(): Promise<void> {
        const credentials = await TokenStorage.getCredentials();
        if (!credentials) {
            this.transition({ status: 'idle' });
            return;
        }

        const invitationVerified = isInvitationGateEnabled()
            ? credentials.invitationVerified === true
            : true;

        this.transition({
            status: 'authenticated',
            credentials,
            invitationVerified,
        });

        if (credentials.token && credentials.secret) {
            this.scheduleRecoveryBootstrap(credentials.token, credentials.secret);
        }

        if (isInvitationGateEnabled() && credentials.token) {
            this.refreshInvitationStatusAsync(credentials.token);
        }
    }

    // ── Private helpers ──

    private transition(nextState: AuthState): void {
        this.state = nextState;
        this.emit();
    }

    private emit(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    private extractToken(): string | undefined {
        if (this.state.status === 'authenticated') {
            return this.state.credentials.token;
        }
        return undefined;
    }

    private async refreshInvitationStatusAsync(token: string): Promise<void> {
        try {
            const status = await fetchInvitationStatus(token);
            this.patchInvitationState(status.verified);
        } catch {
            // Server unreachable — keep current state instead of forcing
            // the user back to the invitation screen on transient failures.
        }
    }

    private patchInvitationState(verified: boolean): void {
        if (this.state.status !== 'authenticated') {
            return;
        }

        const current = this.state;
        if (current.invitationVerified === verified) {
            return;
        }

        const nextCredentials: AuthCredentials = {
            ...current.credentials,
            invitationVerified: verified,
        };

        TokenStorage.setCredentials(nextCredentials).catch(() => {
            // Persist failure is non-critical for optimistic UI
        });

        this.transition({
            status: 'authenticated',
            credentials: nextCredentials,
            invitationVerified: verified,
        });
    }

    private scheduleRecoveryBootstrap(token: string, secret: string): void {
        const cacheKey = `${token}:${secret}`;
        if (this.bootstrappedRecoveryKey === cacheKey) {
            return;
        }

        this.bootstrappedRecoveryKey = cacheKey;
        bootstrapRecoveryMaterial(token, secret).catch(() => {
            // Recovery bootstrap is best-effort; failures should not block auth
        });
    }
}

export const authOrchestrator = new AuthOrchestratorImpl();
