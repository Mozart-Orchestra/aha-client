import type { SupabaseOAuthCallbackState } from '@/auth/supabaseCallback';
import type { AuthCredentials } from '@/auth/tokenStorage';
import { NonRetryableError } from '@/utils/time';

export function shouldPreferSupabaseCallback(
    callbackState: SupabaseOAuthCallbackState | null | undefined,
): boolean {
    return Boolean(callbackState?.accessToken || callbackState?.refreshToken);
}

export function selectBootCredentials(
    storedCredentials: AuthCredentials | null,
    callbackState: SupabaseOAuthCallbackState | null | undefined,
): AuthCredentials | null {
    if (shouldPreferSupabaseCallback(callbackState)) {
        return null;
    }

    return storedCredentials;
}

export function shouldDropStoredCredentialsAfterRestoreFailure(error: unknown): boolean {
    return error instanceof NonRetryableError && /unauthorized/i.test(error.message);
}

export function selectSupabaseCompletionAccessToken(
    sessionAccessToken: string | null | undefined,
    callbackState: SupabaseOAuthCallbackState | null | undefined,
): string | null {
    return sessionAccessToken ?? callbackState?.accessToken ?? null;
}
