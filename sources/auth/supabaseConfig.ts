const SUPABASE_URL_ENV_NAME = 'EXPO_PUBLIC_SUPABASE_URL';
const SUPABASE_ANON_KEY_ENV_NAME = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const JWT_LIKE_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const BOOLEAN_TRUE_PATTERN = /^(1|true|yes|on)$/i;
const BOOLEAN_FALSE_PATTERN = /^(0|false|no|off)$/i;

export function resolveSupabaseUrl(envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL): string {
    const trimmed = envUrl?.trim();
    if (trimmed) {
        return trimmed;
    }

    throw new Error(`Missing required ${SUPABASE_URL_ENV_NAME}`);
}

export function isLikelySupabaseAnonKey(value: string): boolean {
    return JWT_LIKE_PATTERN.test(value.trim());
}

export function resolveSupabaseAnonKey(envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY): string {
    const trimmed = envKey?.trim();
    if (trimmed && isLikelySupabaseAnonKey(trimmed)) {
        return trimmed;
    }

    if (!trimmed) {
        throw new Error(`Missing required ${SUPABASE_ANON_KEY_ENV_NAME}`);
    }

    throw new Error(`Invalid ${SUPABASE_ANON_KEY_ENV_NAME}`);
}

export function resolveSupabaseEmailOtpEnabled(envValue = process.env.EXPO_PUBLIC_SUPABASE_EMAIL_OTP_ENABLED): boolean {
    const trimmed = envValue?.trim();
    if (!trimmed) {
        return true;
    }

    if (BOOLEAN_TRUE_PATTERN.test(trimmed)) {
        return true;
    }

    if (BOOLEAN_FALSE_PATTERN.test(trimmed)) {
        return false;
    }

    return true;
}

export { SUPABASE_ANON_KEY_ENV_NAME, SUPABASE_URL_ENV_NAME };
