import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
    Platform: { OS: 'ios' },
}));

vi.mock('expo-updates', () => ({
    reloadAsync: vi.fn(),
}));

vi.mock('@/sync/sync', () => ({
    syncCreate: vi.fn(),
    syncReinitialize: vi.fn(),
}));

vi.mock('@/sync/persistence', () => ({
    clearPersistence: vi.fn(),
}));

vi.mock('@/track', () => ({
    trackLogout: vi.fn(),
}));

vi.mock('@/utils/hubToken', () => ({
    invalidateHubToken: vi.fn(),
}));

vi.mock('@/auth/supabaseAuth', () => ({
    bootstrapRecoveryMaterial: vi.fn().mockResolvedValue(undefined),
    signOutSupabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/auth/invitationStatus', () => ({
    fetchInvitationStatus: vi.fn().mockResolvedValue({ verified: true, verifiedAt: null, codeUsed: null }),
}));

vi.mock('@/auth/invitationGate', () => ({
    isInvitationGateEnabled: vi.fn(() => false),
}));

import { AuthOrchestratorImpl } from '@/auth/authOrchestrator';
import { TokenStorage } from '@/auth/tokenStorage';
import { syncCreate, syncReinitialize } from '@/sync/sync';
import { clearPersistence } from '@/sync/persistence';
import { trackLogout } from '@/track';
import { invalidateHubToken } from '@/utils/hubToken';
import { bootstrapRecoveryMaterial, signOutSupabase } from '@/auth/supabaseAuth';
import { fetchInvitationStatus } from '@/auth/invitationStatus';
import { isInvitationGateEnabled } from '@/auth/invitationGate';

describe('AuthOrchestrator', () => {
    let orchestrator: AuthOrchestratorImpl;

    beforeEach(() => {
        orchestrator = new AuthOrchestratorImpl();
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('starts in idle state', () => {
            expect(orchestrator.getCurrentState()).toEqual({ status: 'idle' });
        });
    });

    describe('login', () => {
        it('transitions to authenticated on successful login', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);

            await orchestrator.login('token-1', 'secret-1');

            expect(orchestrator.getCurrentState()).toMatchObject({
                status: 'authenticated',
                credentials: { token: 'token-1', secret: 'secret-1' },
                invitationVerified: true,
            });
            expect(syncCreate).toHaveBeenCalledTimes(1);
            expect(syncReinitialize).not.toHaveBeenCalled();
        });

        it('uses syncReinitialize when already authenticated (re-auth)', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);
            vi.mocked(syncReinitialize).mockResolvedValue(undefined);

            await orchestrator.login('token-1', 'secret-1');
            await orchestrator.login('token-2', 'secret-2');

            expect(syncCreate).toHaveBeenCalledTimes(1);
            expect(syncReinitialize).toHaveBeenCalledTimes(1);
            expect(orchestrator.getCurrentState()).toMatchObject({
                status: 'authenticated',
                credentials: { token: 'token-2', secret: 'secret-2' },
            });
        });

        it('throws and transitions to error when persistence fails', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(false);

            await expect(orchestrator.login('token-1', 'secret-1')).rejects.toThrow('Failed to save credentials');
            expect(orchestrator.getCurrentState()).toMatchObject({ status: 'error' });
        });

        it('blocks concurrent login attempts', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
            );

            const first = orchestrator.login('token-1', 'secret-1');
            await expect(orchestrator.login('token-2', 'secret-2')).rejects.toThrow('Cannot login while authenticating');

            await first;
        });

        it('bootstraps recovery material after login', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);

            await orchestrator.login('token-1', 'secret-1');

            // Allow microtask queue to flush
            await new Promise((r) => setTimeout(r, 10));
            expect(bootstrapRecoveryMaterial).toHaveBeenCalledWith('token-1', 'secret-1');
        });
    });

    describe('logout', () => {
        it('transitions to idle and clears state', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.spyOn(TokenStorage, 'removeCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);

            await orchestrator.login('token-1', 'secret-1');
            await orchestrator.logout();

            expect(orchestrator.getCurrentState()).toEqual({ status: 'idle' });
            expect(trackLogout).toHaveBeenCalled();
            expect(clearPersistence).toHaveBeenCalled();
            expect(invalidateHubToken).toHaveBeenCalled();
            expect(TokenStorage.removeCredentials).toHaveBeenCalled();
            expect(signOutSupabase).toHaveBeenCalled();
        });

        it('is idempotent when already logging out', async () => {
            vi.spyOn(TokenStorage, 'removeCredentials').mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
            );

            orchestrator.logout();
            await orchestrator.logout();

            expect(TokenStorage.removeCredentials).toHaveBeenCalledTimes(1);
        });
    });

    describe('rehydrate', () => {
        it('restores authenticated state from stored credentials', async () => {
            vi.spyOn(TokenStorage, 'getCredentials').mockResolvedValue({
                token: 'stored-token',
                secret: 'stored-secret',
                invitationVerified: true,
            });

            await orchestrator.rehydrate();

            expect(orchestrator.getCurrentState()).toMatchObject({
                status: 'authenticated',
                credentials: { token: 'stored-token', secret: 'stored-secret' },
                invitationVerified: true,
            });
        });

        it('transitions to idle when no stored credentials', async () => {
            vi.spyOn(TokenStorage, 'getCredentials').mockResolvedValue(null);

            await orchestrator.rehydrate();

            expect(orchestrator.getCurrentState()).toEqual({ status: 'idle' });
        });
    });

    describe('subscription', () => {
        it('notifies listeners on state transitions', async () => {
            const listener = vi.fn();
            orchestrator.subscribe(listener);
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);

            await orchestrator.login('token-1', 'secret-1');

            const calls = listener.mock.calls.map((c) => c[0]);
            // First call is the initial subscribe callback (none — subscribe does not emit current state)
            // Then authenticating, then authenticated
            expect(calls[0]).toEqual({ status: 'authenticating' });
            expect(calls[calls.length - 1]).toMatchObject({ status: 'authenticated' });
        });

        it('allows unsubscribing', () => {
            const listener = vi.fn();
            const unsubscribe = orchestrator.subscribe(listener);
            unsubscribe();

            orchestrator.login('t', 's').catch(() => { /* ignore */ });
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('invitation status', () => {
        beforeEach(() => {
            vi.mocked(isInvitationGateEnabled).mockReturnValue(true);
        });

        it('refreshes invitation status from server when authenticated', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);
            vi.mocked(fetchInvitationStatus).mockResolvedValue({ verified: true, verifiedAt: null, codeUsed: null });

            await orchestrator.login('token-1', 'secret-1');
            // Allow async invitation refresh
            await new Promise((r) => setTimeout(r, 10));

            expect(fetchInvitationStatus).toHaveBeenCalledWith('token-1');
        });

        it('markInvitationVerified patches state optimistically', async () => {
            vi.spyOn(TokenStorage, 'setCredentials').mockResolvedValue(true);
            vi.mocked(syncCreate).mockResolvedValue(undefined);
            vi.mocked(fetchInvitationStatus).mockResolvedValue({ verified: false, verifiedAt: null, codeUsed: null });

            await orchestrator.login('token-1', 'secret-1', false);
            expect(orchestrator.getCurrentState()).toMatchObject({
                status: 'authenticated',
                invitationVerified: false,
            });

            orchestrator.markInvitationVerified();

            expect(orchestrator.getCurrentState()).toMatchObject({
                status: 'authenticated',
                invitationVerified: true,
            });
        });
    });
});
