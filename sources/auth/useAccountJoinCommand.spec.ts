import * as React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createAccountJoinTicket = vi.fn();
const getCliInstallAndLoginCommand = vi.fn((ticket?: string) => ticket ? `cmd:${ticket}` : 'cmd:fallback');

vi.mock('@/auth/accountJoinTicket', () => ({
    createAccountJoinTicket: (...args: unknown[]) => createAccountJoinTicket(...args),
}));

vi.mock('@/auth/cliCommands', () => ({
    getCliInstallAndLoginCommand: (ticket?: string) => getCliInstallAndLoginCommand(ticket),
}));

import { useAccountJoinCommand } from '@/auth/useAccountJoinCommand';

function renderHook<Result>(hook: () => Result) {
    let current: Result;
    function Wrapper() {
        current = hook();
        return null;
    }

    let renderer: ReturnType<typeof create>;
    act(() => {
        renderer = create(React.createElement(Wrapper));
    });

    return {
        result: {
            get current() {
                return current!;
            },
        },
        unmount: () => act(() => renderer.unmount()),
    };
}

describe('useAccountJoinCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'));
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    });

    it('refreshes the join command when the cached ticket has expired', async () => {
        createAccountJoinTicket
            .mockResolvedValueOnce({
                ticket: 'ticket-1',
                expiresAt: new Date(Date.now() + 5_000).toISOString(),
            })
            .mockResolvedValueOnce({
                ticket: 'ticket-2',
                expiresAt: new Date(Date.now() + 15_000).toISOString(),
            });

        const { result, unmount } = renderHook(() => useAccountJoinCommand('token-123'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.primaryCommand).toBe('cmd:ticket-1');
        expect(createAccountJoinTicket).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(6_000);
            vi.setSystemTime(new Date('2026-04-02T00:00:06.000Z'));
            await result.current.ensureFreshJoinCommand();
        });

        expect(result.current.primaryCommand).toBe('cmd:ticket-2');
        expect(createAccountJoinTicket).toHaveBeenCalledTimes(2);

        unmount();
    });

    it('keeps the last valid join command when refresh fails before expiry', async () => {
        createAccountJoinTicket
            .mockResolvedValueOnce({
                ticket: 'ticket-1',
                expiresAt: new Date(Date.now() + 20_000).toISOString(),
            })
            .mockRejectedValueOnce(new Error('network down'));

        const { result, unmount } = renderHook(() => useAccountJoinCommand('token-123'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.primaryCommand).toBe('cmd:ticket-1');

        await act(async () => {
            vi.advanceTimersByTime(5_000);
            vi.setSystemTime(new Date('2026-04-02T00:00:05.000Z'));
            await expect(result.current.ensureFreshJoinCommand()).resolves.toBe('cmd:ticket-1');
        });

        expect(result.current.primaryCommand).toBe('cmd:ticket-1');
        expect(result.current.hasRefreshError).toBe(true);

        unmount();
    });
});
