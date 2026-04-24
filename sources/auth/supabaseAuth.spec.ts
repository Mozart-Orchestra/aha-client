import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    axiosGet,
    axiosPost,
    clearLegacyStoredSecretForMigration,
} = vi.hoisted(() => ({
    axiosGet: vi.fn(),
    axiosPost: vi.fn(),
    clearLegacyStoredSecretForMigration: vi.fn(),
}));

vi.mock('react-native', () => ({
    Platform: { OS: 'web' },
}));

vi.mock('@/auth/supabase', () => ({
    supabase: {
        auth: {
            signInWithOAuth: vi.fn(),
            signInWithOtp: vi.fn(),
            verifyOtp: vi.fn(),
        },
    },
}));

vi.mock('@/auth/authGetToken', () => ({
    authGetToken: vi.fn(),
}));

vi.mock('@/auth/supabaseCallback', () => ({
    getWebSupabaseOAuthRedirectUrl: vi.fn(() => 'https://aha-agi.com/webappv3/'),
    getWebSupabaseRedirectUrl: vi.fn(() => 'https://aha-agi.com/webappv3/'),
}));

vi.mock('@/encryption/base64', () => ({
    decodeBase64: (value: string) => Uint8Array.from(Buffer.from(value, 'base64')),
    encodeBase64: (value: Uint8Array | string) => Buffer.from(value instanceof Uint8Array ? value : value).toString('base64'),
}));

vi.mock('@/encryption/libsodium', () => ({
    decryptBox: vi.fn(),
    default: {
        crypto_box_keypair: () => ({
            publicKey: new Uint8Array(32).fill(2),
            privateKey: new Uint8Array(32).fill(3),
        }),
        crypto_box_easy: () => new Uint8Array([7, 8, 9]),
        crypto_box_NONCEBYTES: 24,
        crypto_sign_seed_keypair: () => ({
            publicKey: new Uint8Array(32).fill(4),
        }),
    },
}));

vi.mock('@/auth/authQRStart', () => ({
    generateAuthKeyPair: () => ({
        publicKey: new Uint8Array(32).fill(5),
        secretKey: new Uint8Array(32).fill(6),
    }),
}));

vi.mock('@/auth/tokenStorage', () => ({
    clearLegacyStoredSecretForMigration,
    getLegacyStoredSecretForMigration: vi.fn(() => null),
}));

vi.mock('expo-web-browser', () => ({
    default: {},
    openAuthSessionAsync: vi.fn(),
}));

vi.mock('expo-linking', () => ({
    default: {},
    createURL: vi.fn(),
}));

vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: () => 'https://aha-agi.com/api',
}));

vi.mock('axios', () => ({
    default: {
        get: axiosGet,
        post: axiosPost,
        isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    },
}));

vi.mock('expo-crypto', () => ({
    getRandomBytesAsync: vi.fn(async (length: number) => new Uint8Array(length).fill(1)),
}));

import { completeSupabaseSession } from '@/auth/supabaseAuth';

describe('completeSupabaseSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axiosGet.mockResolvedValue({
            data: {
                wrappingPublicKey: Buffer.from(new Uint8Array(32).fill(9)).toString('base64'),
            },
        });
        axiosPost.mockResolvedValue({
            data: {
                state: 'new_account_created',
                token: 'happy-token',
                userId: 'user-1',
                invitationVerified: true,
            },
        });
    });

    it('deduplicates concurrent completion requests for the same Supabase access token', async () => {
        const [left, right] = await Promise.all([
            completeSupabaseSession('supabase-access-token'),
            completeSupabaseSession('supabase-access-token'),
        ]);

        expect(left).toEqual(right);
        expect(axiosGet).toHaveBeenCalledTimes(1);
        expect(axiosPost).toHaveBeenCalledTimes(1);
        expect(clearLegacyStoredSecretForMigration).toHaveBeenCalledTimes(1);
    });
});
