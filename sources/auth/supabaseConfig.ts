const DEFAULT_SUPABASE_URL = 'https://cegpdcfsqcfowgwkpanl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZ3BkY2ZzcWNmb3dnd2twYW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODM3MDcsImV4cCI6MjA5MDQ1OTcwN30.4Y2QD5oTjze_QxEAeTBPUYTbOhhCeCr-LRVyJoiIK64';

const JWT_LIKE_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const BOOLEAN_TRUE_PATTERN = /^(1|true|yes|on)$/i;

export function resolveSupabaseUrl(envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL): string {
    const trimmed = envUrl?.trim();
    return trimmed ? trimmed : DEFAULT_SUPABASE_URL;
}

export function isLikelySupabaseAnonKey(value: string): boolean {
    return JWT_LIKE_PATTERN.test(value.trim());
}

export function resolveSupabaseAnonKey(envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY): string {
    const trimmed = envKey?.trim();
    if (trimmed && isLikelySupabaseAnonKey(trimmed)) {
        return trimmed;
    }

    return DEFAULT_SUPABASE_ANON_KEY;
}

export function resolveSupabaseEmailOtpEnabled(envValue = process.env.EXPO_PUBLIC_SUPABASE_EMAIL_OTP_ENABLED): boolean {
    return BOOLEAN_TRUE_PATTERN.test(envValue?.trim() ?? '');
}

export { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL };
