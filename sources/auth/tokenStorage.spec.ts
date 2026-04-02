import { describe, expect, it, vi } from 'vitest';

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
import { shouldReloadForWebAuthSyncEvent } from '@/auth/tokenStorage';

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
