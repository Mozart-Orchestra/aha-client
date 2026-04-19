import { describe, expect, it } from 'vitest';

import { shouldClearSupabaseSessionError } from '@/auth/supabaseSessionError';

describe('shouldClearSupabaseSessionError', () => {
    it('returns false for empty errors', () => {
        expect(shouldClearSupabaseSessionError(undefined)).toBe(false);
        expect(shouldClearSupabaseSessionError(null)).toBe(false);
    });

    it('returns true for 401-like errors', () => {
        expect(shouldClearSupabaseSessionError({ status: 401 })).toBe(true);
        expect(shouldClearSupabaseSessionError({ code: 401 })).toBe(true);
    });

    it('returns true for invalid api key messages', () => {
        expect(shouldClearSupabaseSessionError({ message: 'Invalid API key' })).toBe(true);
        expect(shouldClearSupabaseSessionError({ message: 'Email sign-in failed: Invalid API key' })).toBe(true);
    });

    it('returns true for refresh token errors', () => {
        expect(shouldClearSupabaseSessionError({ message: 'Invalid Refresh Token: Already Used' })).toBe(true);
    });

    it('ignores unrelated errors', () => {
        expect(shouldClearSupabaseSessionError({ status: 400, message: 'Unable to validate email address: invalid format' })).toBe(false);
    });
});
