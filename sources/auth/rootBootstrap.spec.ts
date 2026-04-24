import { describe, expect, it } from 'vitest';

import type { AuthCredentials } from '@/auth/tokenStorage';
import {
    selectBootCredentials,
    shouldDropStoredCredentialsAfterRestoreFailure,
    shouldPreferSupabaseCallback,
} from '@/auth/rootBootstrap';
import { NonRetryableError } from '@/utils/time';

describe('rootBootstrap', () => {
    const storedCredentials: AuthCredentials = {
        token: 'token-1',
        secret: 'secret-1',
        invitationVerified: true,
    };

    it('keeps stored credentials during a normal reload with no OAuth callback', () => {
        expect(selectBootCredentials(storedCredentials, null)).toEqual(storedCredentials);
        expect(shouldPreferSupabaseCallback(null)).toBe(false);
    });

    it('prefers the incoming Supabase callback over stale stored credentials', () => {
        const callbackState = {
            accessToken: 'access-token-1',
            refreshToken: 'refresh-token-1',
            error: null,
            errorCode: null,
            errorDescription: null,
        };

        expect(shouldPreferSupabaseCallback(callbackState)).toBe(true);
        expect(selectBootCredentials(storedCredentials, callbackState)).toBeNull();
    });

    it('does not discard stored credentials for error-only callback hashes', () => {
        const callbackState = {
            accessToken: null,
            refreshToken: null,
            error: 'server_error',
            errorCode: 'unexpected_failure',
            errorDescription: 'Unable to exchange external code',
        };

        expect(shouldPreferSupabaseCallback(callbackState)).toBe(false);
        expect(selectBootCredentials(storedCredentials, callbackState)).toEqual(storedCredentials);
    });

    it('drops stored credentials after an unauthorized restore failure', () => {
        expect(shouldDropStoredCredentialsAfterRestoreFailure(new NonRetryableError('Unauthorized'))).toBe(true);
        expect(shouldDropStoredCredentialsAfterRestoreFailure(new NonRetryableError('401 unauthorized'))).toBe(true);
    });

    it('keeps stored credentials for non-auth restore failures', () => {
        expect(shouldDropStoredCredentialsAfterRestoreFailure(new Error('network timeout'))).toBe(false);
        expect(shouldDropStoredCredentialsAfterRestoreFailure(new NonRetryableError('Server unavailable'))).toBe(false);
    });
});
