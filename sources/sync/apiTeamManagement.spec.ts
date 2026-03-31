import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthCredentials } from '@/auth/tokenStorage';
import { NonRetryableError } from '@/utils/time';

import { createCorps, deleteTeam } from './apiTeamManagement';

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

    it('serializes corps seat configs without null machine/path fields', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: vi.fn().mockResolvedValue({
                success: true,
                corps: {
                    id: 'team-corps',
                    name: 'Launch Squad',
                    seatCount: 1,
                    plannedMemberCount: 1,
                },
                team: {
                    id: 'team-corps',
                    name: 'Launch Squad',
                    memberCount: 0,
                    taskCount: 0,
                    createdAt: 1,
                    updatedAt: 2,
                },
                plannedMembers: [],
            }),
        });

        await createCorps(credentials, {
            name: 'Launch Squad',
            machineId: null,
            workspacePath: null,
            seats: [
                {
                    genomeId: 'genome-builder',
                    roleId: 'builder',
                    runtimeType: 'codex',
                    machineId: null,
                    workspacePath: null,
                    quantity: 1,
                },
            ],
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
        const parsedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(parsedBody).toEqual({
            name: 'Launch Squad',
            seats: [
                {
                    genomeId: 'genome-builder',
                    roleId: 'builder',
                    runtimeType: 'codex',
                    quantity: 1,
                },
            ],
        });
    });
});
