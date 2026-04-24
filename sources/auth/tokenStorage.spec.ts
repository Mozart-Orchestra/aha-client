import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
    Platform: {
        OS: 'web',
        select: (value: Record<string, unknown>) => value.web ?? value.default,
    },
}));

vi.mock('expo-secure-store', () => ({
    default: {
        getItemAsync: vi.fn(),
        setItemAsync: vi.fn(),
        deleteItemAsync: vi.fn(),
    },
}));

import type { AuthCredentials, WebAuthSyncEvent } from '@/auth/tokenStorage';
import {
    clearStoredCredentialsForSupabaseCallback,
    getLegacyStoredSecretForMigration,
    shouldReloadForWebAuthSyncEvent,
    TokenStorage,
} from '@/auth/tokenStorage';

const mockStorage = new Map<string, string>();

async function digestSecret(secret: string): Promise<string> {
    const encoded = new TextEncoder().encode(secret);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

describe('shouldReloadForWebAuthSyncEvent', () => {
    it('skips reload when a login event matches the current secret', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
        };
        const event: WebAuthSyncEvent = {
            type: 'login',
            timestamp: Date.now(),
            secretDigest: await digestSecret('same-secret'),
        };

        await expect(shouldReloadForWebAuthSyncEvent(credentials, event)).resolves.toBe(false);
    });

    it('reloads when a login event points at a different account secret', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'current-secret',
        };
        const event: WebAuthSyncEvent = {
            type: 'login',
            timestamp: Date.now(),
            secretDigest: await digestSecret('other-secret'),
        };

        await expect(shouldReloadForWebAuthSyncEvent(credentials, event)).resolves.toBe(true);
    });

    it('does not reload on logout when already signed out', async () => {
        const event: WebAuthSyncEvent = {
            type: 'logout',
            timestamp: Date.now(),
        };

        await expect(shouldReloadForWebAuthSyncEvent(null, event)).resolves.toBe(false);
    });
});

describe('TokenStorage', () => {
    beforeEach(() => {
        mockStorage.clear();
        Object.defineProperty(global, 'window', {
            value: {},
            writable: true,
            configurable: true,
        });
        Object.defineProperty(global, 'localStorage', {
            value: {
                getItem: (key: string) => mockStorage.get(key) ?? null,
                setItem: (key: string, value: string) => { mockStorage.set(key, value); },
                removeItem: (key: string) => { mockStorage.delete(key); },
                clear: () => { mockStorage.clear(); },
            },
            writable: true,
            configurable: true,
        });
    });

    it('preserves the last known invitation state with credentials', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
            invitationVerified: true,
        };

        await expect(TokenStorage.setCredentials(credentials)).resolves.toBe(true);
        await expect(TokenStorage.getCredentials()).resolves.toEqual(credentials);
        await expect(TokenStorage.removeCredentials()).resolves.toBe(true);
    });

    it('rehydrates persisted web credentials after a full reload', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
            invitationVerified: false,
        };

        await expect(TokenStorage.setCredentials(credentials)).resolves.toBe(true);

        vi.resetModules();
        const reloadedModule = await import('@/auth/tokenStorage');

        await expect(reloadedModule.TokenStorage.getCredentials()).resolves.toEqual(credentials);
    });

    it('stores the current web secret for future reauth migration', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
        };

        await expect(TokenStorage.setCredentials(credentials)).resolves.toBe(true);
        expect(getLegacyStoredSecretForMigration()).toBe('same-secret');
    });

    it('clears the legacy reauth secret on logout on web', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
        };

        await expect(TokenStorage.setCredentials(credentials)).resolves.toBe(true);
        await expect(TokenStorage.removeCredentials()).resolves.toBe(true);
        expect(getLegacyStoredSecretForMigration()).toBeNull();
        expect(mockStorage.get('auth_credentials')).toBeUndefined();
    });

    it('clears only active credentials during a Supabase callback and preserves the legacy reauth secret', async () => {
        const credentials: AuthCredentials = {
            token: 'token-1',
            secret: 'same-secret',
        };

        await expect(TokenStorage.setCredentials(credentials)).resolves.toBe(true);
        expect(clearStoredCredentialsForSupabaseCallback()).toBe(true);

        await expect(TokenStorage.getCredentials()).resolves.toBeNull();
        expect(getLegacyStoredSecretForMigration()).toBe('same-secret');
        expect(mockStorage.get('auth_credentials')).toBeUndefined();
    });
});
