import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: () => 'https://test-server.example',
}));

vi.mock('@/auth/AuthContext', () => ({
    getCurrentAuth: () => null,
}));

vi.stubGlobal('fetch', mockFetch);

import {
    __resetEvolutionTeamAccessCircuitForTests,
    fetchBypassAgents,
    fetchRepairSignals,
    fetchSupervisorState,
} from './apiEvolution';

function teamMismatchResponse() {
    return {
        ok: false,
        status: 403,
        clone: () => ({
            json: () => Promise.resolve({
                code: 'TEAM_ACCOUNT_MISMATCH',
                error: 'Team account mismatch',
            }),
        }),
    } as Response;
}

describe('apiEvolution team access circuit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        __resetEvolutionTeamAccessCircuitForTests();
    });

    it('stops repeating bypass-agent requests after terminal team access errors', async () => {
        mockFetch.mockResolvedValue(teamMismatchResponse());

        const credentials = { token: 'token-1', secret: new Uint8Array() } as any;
        await expect(fetchBypassAgents(credentials, 'team-1')).resolves.toEqual({ agents: [] });
        await expect(fetchBypassAgents(credentials, 'team-1')).resolves.toEqual({ agents: [] });

        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('stops repeating supervisor and repair requests after terminal team access errors', async () => {
        mockFetch.mockResolvedValue(teamMismatchResponse());

        const credentials = { token: 'token-1', secret: new Uint8Array() } as any;
        await expect(fetchSupervisorState(credentials, 'team-1')).resolves.toEqual({ state: null });
        await expect(fetchSupervisorState(credentials, 'team-1')).resolves.toEqual({ state: null });
        await expect(fetchRepairSignals(credentials, 'team-1')).resolves.toEqual({ signals: [], total: 0 });
        await expect(fetchRepairSignals(credentials, 'team-1')).resolves.toEqual({ signals: [], total: 0 });

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});
