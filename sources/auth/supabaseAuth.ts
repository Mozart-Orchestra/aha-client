import { supabase } from '@/auth/supabase';
import { authChallenge } from '@/auth/authChallenge';
import { encodeBase64 } from '@/encryption/base64';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getServerUrl } from '@/sync/serverConfig';
import axios from 'axios';

interface SupabaseLoginResult {
    token: string;
    userId: string;
}

export class SupabaseRestoreRequiredError extends Error {
    constructor(message = 'This account already exists. Restore the existing key to continue.') {
        super(message);
        this.name = 'SupabaseRestoreRequiredError';
    }
}

export class SupabaseAccountLinkConflictError extends Error {
    constructor(message = 'This restore key is already linked to a different sign-in account.') {
        super(message);
        this.name = 'SupabaseAccountLinkConflictError';
    }
}

export class SupabaseSecretMismatchError extends Error {
    constructor(message = 'This Google account is bound to a different device secret. Use your backup key or QR link to restore access.') {
        super(message);
        this.name = 'SupabaseSecretMismatchError';
    }
}

/**
 * Initiates Google OAuth sign-in via Supabase.
 * On web: redirects in-page. On native: opens system browser.
 */
export async function signInWithGoogle(): Promise<void> {
    if (Platform.OS === 'web') {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
    } else {
        const redirectUrl = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
        });

        if (error) {
            throw new Error(`Google sign-in failed: ${error.message}`);
        }

        if (data.url) {
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
            if (result.type === 'success' && result.url) {
                const params = new URL(result.url);
                const accessToken = params.searchParams.get('access_token')
                    ?? params.hash?.match(/access_token=([^&]+)/)?.[1];
                const refreshToken = params.searchParams.get('refresh_token')
                    ?? params.hash?.match(/refresh_token=([^&]+)/)?.[1];

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                }
            }
        }
    }
}

/**
 * Sends OTP code to the given email via Supabase.
 */
export async function signInWithEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            emailRedirectTo: undefined,
        },
    });

    if (error) {
        throw new Error(`Email sign-in failed: ${error.message}`);
    }
}

/**
 * Verifies the OTP code sent to the user's email.
 */
export async function verifyEmailOtp(email: string, otp: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
    });

    if (error) {
        throw new Error(`OTP verification failed: ${error.message}`);
    }
}

/**
 * Exchanges a Supabase session for a happy-server token.
 * Client proves possession of the secret via challenge-response.
 * Server verifies Supabase token + links/validates the account.
 * Returns only the happy-server token (secret never leaves client).
 */
export async function exchangeSupabaseSession(accessToken: string, secret: Uint8Array): Promise<SupabaseLoginResult> {
    const serverUrl = getServerUrl();
    const { challenge, publicKey, signature } = authChallenge(secret);

    try {
        const response = await axios.post(`${serverUrl}/v1/auth/supabase/exchange`, {
            accessToken,
            challenge: encodeBase64(challenge),
            publicKey: encodeBase64(publicKey),
            signature: encodeBase64(signature),
        });

        return {
            token: response.data.token,
            userId: response.data.userId,
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            const code = error.response.data?.code;
            if (code === 'RESTORE_REQUIRED') {
                throw new SupabaseRestoreRequiredError();
            }
            if (code === 'ACCOUNT_LINK_CONFLICT') {
                throw new SupabaseAccountLinkConflictError();
            }
            // v3-online-001: secret proof doesn't match the bound account.
            // User must restore via backup key or QR link first.
            if (code === 'secret-proof-mismatch' || code === 'secret-proof-required') {
                throw new SupabaseSecretMismatchError();
            }
        }
        throw error;
    }
}

/**
 * Signs out from Supabase.
 */
export async function signOutSupabase(): Promise<void> {
    await supabase.auth.signOut();
}
