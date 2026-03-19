import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthCredentials } from '@/auth/tokenStorage';
import { NonRetryableError } from '@/utils/time';

import { deleteTeam } from './apiTeamManagement';

vi.mock('./serverConfig', () => ({
    getServerUrl: () => 'https://api.test.com',
}));

vi.mock('@/utils/handleResponse', () => ({
    checkAuth: vi.fn(),
}));

vi.mock('@/utils/time', async () => {
    const actual = await vi.importActual<typeof import('@/utils/time')>('@/utils/time');
    return {
        ...actual,
        backoff: vi.fn(async <T>(callback: () => Promise<T>) => callback()),
    };
});

describe('apiTeamManagement', () => {
    const credentials: AuthCredentials = {
        token: 'test-token',
        secret: 'test-secret',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('treats missing teams as non-retryable delete errors', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: vi.fn().mockResolvedValue({ error: 'Team not found' }),
        });

        const request = deleteTeam(credentials, 'team-123');

        await expect(request).rejects.toBeInstanceOf(NonRetryableError);
        await expect(request).rejects.toThrow('Team not found');
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
