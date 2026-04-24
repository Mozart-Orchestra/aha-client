import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
    Platform: {
        OS: 'web',
        select: (value: Record<string, unknown>) => value.web ?? value.default,
    },
}));

import {
    clearSupabaseOAuthCallbackHash,
    getWebSupabaseOAuthRedirectUrl,
    getWebSupabaseOAuthOrigin,
    getWebSupabaseRedirectUrl,
    readSupabaseOAuthCallbackState,
} from '@/auth/supabaseCallback';

describe('getWebSupabaseRedirectUrl', () => {
    it('preserves the current path and query string while dropping the hash', () => {
        expect(getWebSupabaseRedirectUrl({
            href: 'https://aha-agi.com/webappv3/?next=%2Fteams#access_token=abc',
        })).toBe('https://aha-agi.com/webappv3/?next=%2Fteams');
    });
});

describe('getWebSupabaseOAuthOrigin', () => {
    it('canonicalizes the production host to apex https before OAuth redirect', () => {
        expect(getWebSupabaseOAuthOrigin({
            href: 'http://www.aha-agi.com/webappv3/?next=%2Fteams',
        })).toBe('https://aha-agi.com');
    });

    it('preserves localhost origins for local development', () => {
        expect(getWebSupabaseOAuthOrigin({
            href: 'http://localhost:8081/webappv3/?next=%2Fteams',
        })).toBe('http://localhost:8081');
    });
});

describe('getWebSupabaseOAuthRedirectUrl', () => {
    it('canonicalizes the production host while preserving the app path and query string', () => {
        expect(getWebSupabaseOAuthRedirectUrl({
            href: 'http://www.aha-agi.com/webappv3/?next=%2Fteams',
        })).toBe('https://aha-agi.com/webappv3/?next=%2Fteams');
    });

    it('preserves localhost callback paths for local development', () => {
        expect(getWebSupabaseOAuthRedirectUrl({
            href: 'http://localhost:8081/webappv3/?next=%2Fteams',
        })).toBe('http://localhost:8081/webappv3/?next=%2Fteams');
    });
});

describe('readSupabaseOAuthCallbackState', () => {
    it('decodes double-encoded OAuth callback errors', () => {
        expect(readSupabaseOAuthCallbackState(
            '#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%253A+4%252F0A',
        )).toEqual({
            accessToken: null,
            refreshToken: null,
            error: 'server_error',
            errorCode: 'unexpected_failure',
            errorDescription: 'Unable to exchange external code: 4/0A',
        });
    });

    it('returns access token details for successful callbacks', () => {
        expect(readSupabaseOAuthCallbackState('#access_token=token-1&refresh_token=refresh-1')).toEqual({
            accessToken: 'token-1',
            refreshToken: 'refresh-1',
            error: null,
            errorCode: null,
            errorDescription: null,
        });
    });
});

describe('clearSupabaseOAuthCallbackHash', () => {
    it('removes the hash without disturbing path or query string', () => {
        const replaceState = vi.fn();

        clearSupabaseOAuthCallbackHash(
            { replaceState },
            { pathname: '/webappv3/', search: '?next=%2Fteams' },
        );

        expect(replaceState).toHaveBeenCalledWith(null, '', '/webappv3/?next=%2Fteams');
    });
});
