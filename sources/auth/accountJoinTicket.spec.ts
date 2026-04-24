import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    axiosPost,
} = vi.hoisted(() => ({
    axiosPost: vi.fn(),
}));

vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: () => 'https://aha-agi.com/api',
}));

vi.mock('axios', () => ({
    default: {
        post: axiosPost,
        isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    },
}));

import { createAccountJoinTicket } from '@/auth/accountJoinTicket';

describe('createAccountJoinTicket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses the primary join-ticket endpoint when available', async () => {
        axiosPost.mockResolvedValue({
            data: {
                code: 'ABC123',
                expiresAt: '2026-04-24T13:00:00.000Z',
            },
        });

        await expect(createAccountJoinTicket('token-1')).resolves.toEqual({
            ticket: 'ABC123',
            expiresAt: '2026-04-24T13:00:00.000Z',
        });

        expect(axiosPost).toHaveBeenCalledTimes(1);
        expect(axiosPost).toHaveBeenCalledWith(
            'https://aha-agi.com/api/v1/account/join-ticket',
            {},
            { headers: { Authorization: 'Bearer token-1' } },
        );
    });

    it('falls back to the legacy join-code endpoint when the new route is missing', async () => {
        axiosPost
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 404 },
            })
            .mockResolvedValueOnce({
                data: {
                    ticket: 'LEGACY1',
                    expiresAt: '2026-04-24T13:00:00.000Z',
                },
            });

        await expect(createAccountJoinTicket('token-2')).resolves.toEqual({
            ticket: 'LEGACY1',
            expiresAt: '2026-04-24T13:00:00.000Z',
        });

        expect(axiosPost).toHaveBeenCalledTimes(2);
        expect(axiosPost).toHaveBeenNthCalledWith(
            1,
            'https://aha-agi.com/api/v1/account/join-ticket',
            {},
            { headers: { Authorization: 'Bearer token-2' } },
        );
        expect(axiosPost).toHaveBeenNthCalledWith(
            2,
            'https://aha-agi.com/api/v1/auth/joincode/create',
            {},
            { headers: { Authorization: 'Bearer token-2' } },
        );
    });
});
