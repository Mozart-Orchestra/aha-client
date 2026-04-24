import { supabase } from '@/auth/supabase';
import { authGetToken } from '@/auth/authGetToken';
import { getWebSupabaseOAuthOrigin, getWebSupabaseRedirectUrl } from '@/auth/supabaseCallback';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { decryptBox } from '@/encryption/libsodium';
import { generateAuthKeyPair } from '@/auth/authQRStart';
import { clearLegacyStoredSecretForMigration, getLegacyStoredSecretForMigration } from '@/auth/tokenStorage';
import sodium from '@/encryption/libsodium.lib';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getServerUrl } from '@/sync/serverConfig';
import axios from 'axios';
import { getRandomBytesAsync } from 'expo-crypto';
import {
    type AuthSession,
    type SupabaseCompleteResponse,
} from '@packages/auth-contract';

/** Recovery result with raw secret bytes (platform-specific, not in contract) */
interface SupabaseRecoveryResult {
    token: string;
    userId: string;
    secret: Uint8Array;
}

/** @deprecated Use AuthSession from @packages/auth-contract directly */
type SupabaseCompleteSessionResult = AuthSession;

export class SupabaseRestoreRequiredError extends Error {
    constructor(message = 'This account already exists. Use another signed-in device to finish linking this machine.') {
        super(message);
        this.name = 'SupabaseRestoreRequiredError';
    }
}

export class SupabaseAccountLinkConflictError extends Error {
    constructor(message = 'This account is already linked to a different sign-in identity.') {
        super(message);
        this.name = 'SupabaseAccountLinkConflictError';
    }
}

export class SupabaseRecoveryNotReadyError extends Error {
    readonly canonicalPublicKey: string | null;

    constructor(
        message = 'Automatic recovery is not ready for this account yet. Open "Add New Device" on another signed-in device to continue.',
        canonicalPublicKey: string | null = null,
    ) {
        super(message);
        this.name = 'SupabaseRecoveryNotReadyError';
        this.canonicalPublicKey = canonicalPublicKey;
    }
}

export class SupabaseAccountNotFoundError extends Error {
    constructor(message = 'No account is linked to this sign-in identity yet.') {
        super(message);
        this.name = 'SupabaseAccountNotFoundError';
    }
}

function encodeHex(bytes: Uint8Array): string {
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function publicKeyHexFromSecret(secret: Uint8Array): string {
    return encodeHex(sodium.crypto_sign_seed_keypair(secret).publicKey);
}

async function getLegacyLinkProofForSupabaseComplete(): Promise<{
    legacyAuthToken: string;
    legacyPublicKey: string;
} | null> {
    if (Platform.OS !== 'web') {
        return null;
    }

    const legacySecretBase64 = getLegacyStoredSecretForMigration();
    if (!legacySecretBase64) {
        return null;
    }

    try {
        const legacySecret = decodeBase64(legacySecretBase64, 'base64url');
        if (legacySecret.length !== 32) {
            return null;
        }

        const legacyAuth = await authGetToken(legacySecret, 'reconnect');
        return {
            legacyAuthToken: legacyAuth.token,
            legacyPublicKey: publicKeyHexFromSecret(legacySecret).toUpperCase(),
        };
    } catch {
        return null;
    }
}

async function tryMigrateLegacyWebSecret(
    accessToken: string,
    canonicalPublicKey: string | null,
): Promise<SupabaseCompleteSessionResult | null> {
    if (Platform.OS !== 'web' || !canonicalPublicKey) {
        return null;
    }

    const legacySecretBase64 = getLegacyStoredSecretForMigration();
    if (!legacySecretBase64) {
        return null;
    }

    try {
        const legacySecret = decodeBase64(legacySecretBase64, 'base64url');
        if (legacySecret.length !== 32) {
            return null;
        }

        if (publicKeyHexFromSecret(legacySecret) !== canonicalPublicKey.toLowerCase()) {
            return null;
        }

        const bootstrapAuth = await authGetToken(legacySecret, 'reconnect');
        await bootstrapRecoveryMaterial(bootstrapAuth.token, legacySecretBase64);

        const recovered = await recoverSupabaseSession(accessToken);
        clearLegacyStoredSecretForMigration();

        return {
            token: recovered.token,
            userId: recovered.userId,
            secretBase64: encodeBase64(recovered.secret, 'base64url'),
            recoveryReady: true,
        };
    } catch (error) {
        console.warn('Failed to migrate legacy web secret into recovery material:', error);
        return null;
    }
}

/**
 * Initiates Google OAuth sign-in via Supabase.
 * On web: redirects in-page. On native: opens system browser.
 */
export async function signInWithGoogle(): Promise<void> {
    if (Platform.OS === 'web') {
        // Use origin only — Supabase redirect URL allowlist is configured per-origin.
        // Using the full pathname (e.g. /webappv3/) causes Supabase to reject the
        // redirect and fall back to its default (localhost), breaking production login.
        const redirectTo = getWebSupabaseOAuthOrigin() ?? getWebSupabaseRedirectUrl();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo ?? undefined,
                queryParams: {
                    prompt: 'select_account',
                },
            },
        });

        if (error) {
            throw new Error(`Google sign-in failed: ${error.message}`);
        }
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
async function fetchWrappingPublicKey(token: string): Promise<Uint8Array | null> {
    const serverUrl = getServerUrl();
    try {
        const response = await axios.get<{ wrappingPublicKey: string }>(
            `${serverUrl}/v1/auth/wrapping-key`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return decodeBase64(response.data.wrappingPublicKey);
    } catch {
        return null;
    }
}

async function buildSupabaseCompleteSecretPayload(accessToken: string, contentSecretKey: Uint8Array): Promise<Record<string, string>> {
    const wrappingPublicKey = await fetchWrappingPublicKey(accessToken);
    if (!wrappingPublicKey) {
        return {
            newContentSecretKey: encodeBase64(contentSecretKey),
        };
    }

    const ephemeral = sodium.crypto_box_keypair();
    const nonce = await getRandomBytesAsync(sodium.crypto_box_NONCEBYTES);
    const ciphertext = sodium.crypto_box_easy(
        contentSecretKey,
        nonce,
        wrappingPublicKey,
        ephemeral.privateKey,
    );

    return {
        newEncryptedContentSecretKey: encodeBase64(ciphertext),
        newNonce: encodeBase64(nonce),
        newEphemeralPublicKey: encodeBase64(ephemeral.publicKey),
    };
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

export async function completeSupabaseSession(accessToken: string): Promise<SupabaseCompleteSessionResult> {
    const serverUrl = getServerUrl();
    const keypair = generateAuthKeyPair();
    const newSecret = await getRandomBytesAsync(32);
    const legacyLinkProof = await getLegacyLinkProofForSupabaseComplete();
    const secretPayload = await buildSupabaseCompleteSecretPayload(accessToken, newSecret);

    try {
        const requestBody: Record<string, unknown> = {
            accessToken,
            recoveryPublicKey: encodeBase64(keypair.publicKey),
            ...secretPayload,
            ...(legacyLinkProof ? {
                legacyPublicKey: legacyLinkProof.legacyPublicKey ?? null,
                legacyAuthToken: legacyLinkProof.legacyAuthToken ?? null,
            } : {}),
        };

        const response = await axios.post<SupabaseCompleteResponse>(`${serverUrl}/v1/auth/supabase/complete`, requestBody);

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

            clearLegacyStoredSecretForMigration();

            return {
                token: response.data.token,
                userId: response.data.userId,
                secretBase64: encodeBase64(secret, 'base64url'),
                recoveryReady: true,
                invitationVerified: response.data.invitationVerified,
            };
        }

        if (response.data.state === 'migration_required') {
            const migrated = await tryMigrateLegacyWebSecret(
                accessToken,
                response.data.canonicalPublicKey ?? null,
            );
            if (migrated) {
                return migrated;
            }

            throw new SupabaseRecoveryNotReadyError(
                undefined,
                response.data.canonicalPublicKey ?? null,
            );
        }

        if (!response.data.token || !response.data.userId) {
            throw new Error('Supabase login completed without an account token');
        }

        clearLegacyStoredSecretForMigration();

        return {
            token: response.data.token,
            userId: response.data.userId,
            secretBase64: encodeBase64(newSecret, 'base64url'),
            recoveryReady: true,
            invitationVerified: response.data.invitationVerified,
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            const code = error.response.data?.code;
            if (code === 'ACCOUNT_LINK_CONFLICT') {
                throw new SupabaseAccountLinkConflictError();
            }
            if (code === 'secret-proof-mismatch' || code === 'secret-proof-required') {
                throw new SupabaseRecoveryNotReadyError();
            }
        }
        throw error;
    }
}

export async function bootstrapRecoveryMaterial(token: string, secretBase64: string): Promise<void> {
    const serverUrl = getServerUrl();
    const contentSecretKey = decodeBase64(secretBase64, 'base64url');
    const wrappingPublicKey = await fetchWrappingPublicKey(token);

    if (wrappingPublicKey) {
        const ephemeral = sodium.crypto_box_keypair();
        const nonce = await getRandomBytesAsync(sodium.crypto_box_NONCEBYTES);
        const ciphertext = sodium.crypto_box_easy(
            contentSecretKey,
            nonce,
            wrappingPublicKey,
            ephemeral.privateKey,
        );

        await axios.post(`${serverUrl}/v1/account/recovery-material`, {
            encryptedContentSecretKey: encodeBase64(ciphertext),
            nonce: encodeBase64(nonce),
            ephemeralPublicKey: encodeBase64(ephemeral.publicKey),
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    } else {
        await axios.post(`${serverUrl}/v1/account/recovery-material`, {
            contentSecretKey: encodeBase64(contentSecretKey),
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    }
}

/**
 * Signs out from Supabase.
 */
export async function signOutSupabase(): Promise<void> {
    await supabase.auth.signOut();
}
