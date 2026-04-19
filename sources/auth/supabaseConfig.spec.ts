import { describe, expect, it } from 'vitest';

import {
    DEFAULT_SUPABASE_ANON_KEY,
    DEFAULT_SUPABASE_URL,
    isLikelySupabaseAnonKey,
    resolveSupabaseAnonKey,
    resolveSupabaseEmailOtpEnabled,
    resolveSupabaseUrl,
} from '@/auth/supabaseConfig';

describe('supabaseConfig', () => {
    it('uses the default URL when the env URL is blank', () => {
        expect(resolveSupabaseUrl()).toBe(DEFAULT_SUPABASE_URL);
        expect(resolveSupabaseUrl('   ')).toBe(DEFAULT_SUPABASE_URL);
    });

    it('uses the env URL when it is provided', () => {
        expect(resolveSupabaseUrl('https://example.supabase.co')).toBe('https://example.supabase.co');
    });

    it('recognizes JWT-like anon keys', () => {
        expect(isLikelySupabaseAnonKey('header.payload.signature')).toBe(true);
        expect(isLikelySupabaseAnonKey('header.payload...REDACTED')).toBe(false);
    });

    it('falls back to the default anon key when the env key is missing or redacted', () => {
        expect(resolveSupabaseAnonKey()).toBe(DEFAULT_SUPABASE_ANON_KEY);
        expect(resolveSupabaseAnonKey('   ')).toBe(DEFAULT_SUPABASE_ANON_KEY);
        expect(resolveSupabaseAnonKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmR0Z...REDACTED')).toBe(DEFAULT_SUPABASE_ANON_KEY);
    });

    it('uses the env anon key when it looks valid', () => {
        const envKey = 'header.payload.signature';
        expect(resolveSupabaseAnonKey(envKey)).toBe(envKey);
    });

    it('disables email OTP login unless explicitly enabled', () => {
        expect(resolveSupabaseEmailOtpEnabled()).toBe(false);
        expect(resolveSupabaseEmailOtpEnabled('')).toBe(false);
        expect(resolveSupabaseEmailOtpEnabled('false')).toBe(false);
        expect(resolveSupabaseEmailOtpEnabled('true')).toBe(true);
        expect(resolveSupabaseEmailOtpEnabled('YES')).toBe(true);
    });
});
