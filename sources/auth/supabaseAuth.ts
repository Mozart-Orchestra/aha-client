import { supabase } from '@/auth/supabase';
import { authChallenge } from '@/auth/authChallenge';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { decryptBox } from '@/encryption/libsodium';
import { generateAuthKeyPair } from '@/auth/authQRStart';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getServerUrl } from '@/sync/serverConfig';
import axios from 'axios';
import { getRandomBytesAsync } from 'expo-crypto';

interface SupabaseLoginResult {
    token: string;
    userId: string;
    recoveryReady: boolean;
}

interface SupabaseRecoveryResult {
    token: string;
    userId: string;
    secret: Uint8Array;
}

interface SupabaseCompleteResponse {
    state: 'existing_recovered' | 'new_account_created' | 'migration_required';
    token: string | null;
    userId: string | null;
    encryptedContentSecretKey?: string | null;
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

export class SupabaseRecoveryNotReadyError extends Error {
    constructor(message = 'Automatic recovery is not ready for this account yet. Use your backup key or an existing device once to finish the upgrade.') {
        super(message);
        this.name = 'SupabaseRecoveryNotReadyError';
    }
}

export class SupabaseAccountNotFoundError extends Error {
    constructor(message = 'No account is linked to this sign-in identity yet.') {
        super(message);
        this.name = 'SupabaseAccountNotFoundError';
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
                queryParams: {
                    prompt: 'select_account',
                },
            },
        });
    } else {
        const redirectUrl = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    prompt: 'select_account',
                },
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
            contentSecretKey: encodeBase64(secret),
        });

        return {
            token: response.data.token,
            userId: response.data.userId,
            recoveryReady: !!response.data.recoveryReady,
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

export async function recoverSupabaseSession(accessToken: string): Promise<SupabaseRecoveryResult> {
    const serverUrl = getServerUrl();
    const keypair = generateAuthKeyPair();

    try {
        const response = await axios.post(`${serverUrl}/v1/auth/supabase/recover`, {
            accessToken,
            recoveryPublicKey: encodeBase64(keypair.publicKey),
        });

        const encryptedContentSecretKey = decodeBase64(response.data.encryptedContentSecretKey);
        const secret = decryptBox(encryptedContentSecretKey, keypair.secretKey);
        if (!secret) {
            throw new Error('Failed to decrypt recovered account secret');
        }

        return {
            token: response.data.token,
            userId: response.data.userId,
            secret,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 404 && error.response.data?.code === 'ACCOUNT_NOT_FOUND') {
                throw new SupabaseAccountNotFoundError();
            }
            if (error.response?.status === 409 && error.response.data?.code === 'RECOVERY_NOT_READY') {
                throw new SupabaseRecoveryNotReadyError();
            }
        }
        throw error;
    }
}

export async function completeSupabaseSession(accessToken: string): Promise<{
    token: string;
    userId: string;
    secretBase64: string;
    recoveryReady: boolean;
}> {
    const serverUrl = getServerUrl();
    const keypair = generateAuthKeyPair();
    const newSecret = await getRandomBytesAsync(32);

    try {
        const response = await axios.post<SupabaseCompleteResponse>(`${serverUrl}/v1/auth/supabase/complete`, {
            accessToken,
            recoveryPublicKey: encodeBase64(keypair.publicKey),
            newContentSecretKey: encodeBase64(newSecret),
        });

        if (response.data.state === 'existing_recovered') {
            const encryptedContentSecretKey = response.data.encryptedContentSecretKey
                ? decodeBase64(response.data.encryptedContentSecretKey)
                : null;
            const secret = encryptedContentSecretKey
                ? decryptBox(encryptedContentSecretKey, keypair.secretKey)
                : null;
            if (!secret || !response.data.token || !response.data.userId) {
                throw new Error('Failed to recover canonical account secret');
            }

            return {
                token: response.data.token,
                userId: response.data.userId,
                secretBase64: encodeBase64(secret, 'base64url'),
                recoveryReady: true,
            };
        }

        if (response.data.state === 'migration_required') {
            throw new SupabaseRecoveryNotReadyError();
        }

        if (!response.data.token || !response.data.userId) {
            throw new Error('Supabase login completed without an account token');
        }

        return {
            token: response.data.token,
            userId: response.data.userId,
            secretBase64: encodeBase64(newSecret, 'base64url'),
            recoveryReady: true,
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            const code = error.response.data?.code;
            if (code === 'ACCOUNT_LINK_CONFLICT') {
                throw new SupabaseAccountLinkConflictError();
            }
            if (code === 'secret-proof-mismatch' || code === 'secret-proof-required') {
                throw new SupabaseSecretMismatchError();
            }
        }
        throw error;
    }
}

export async function bootstrapRecoveryMaterial(token: string, secretBase64: string): Promise<void> {
    const serverUrl = getServerUrl();
    const contentSecretKey = encodeBase64(decodeBase64(secretBase64, 'base64url'));
    await axios.post(`${serverUrl}/v1/account/recovery-material`, {
        contentSecretKey,
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Signs out from Supabase.
 */
export async function signOutSupabase(): Promise<void> {
    await supabase.auth.signOut();
}
