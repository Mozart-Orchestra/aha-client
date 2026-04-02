import * as React from 'react';

import { createAccountJoinTicket } from '@/auth/accountJoinTicket';
import { getCliInstallAndLoginCommand } from '@/auth/cliCommands';

const JOIN_TICKET_REFRESH_THRESHOLD_MS = 30_000;

function parseJoinTicketExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) {
        return null;
    }

    const expiresAtMs = Date.parse(expiresAt);
    return Number.isFinite(expiresAtMs) ? expiresAtMs : null;
}

export function formatJoinTicketTimeRemaining(totalSeconds: number): string {
    const normalizedSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(normalizedSeconds / 3600);
    const minutes = Math.floor((normalizedSeconds % 3600) / 60);
    const seconds = normalizedSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function useAccountJoinCommand(token: string | null | undefined) {
    const fallbackCommand = React.useMemo(() => getCliInstallAndLoginCommand(), []);
    const [joinCommand, setJoinCommand] = React.useState('');
    const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [nowMs, setNowMs] = React.useState(() => Date.now());
    const [hasRefreshError, setHasRefreshError] = React.useState(false);

    const expiresAtMs = React.useMemo(() => parseJoinTicketExpiry(expiresAt), [expiresAt]);
    const secondsRemaining = React.useMemo(() => {
        if (expiresAtMs === null) {
            return null;
        }

        return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }, [expiresAtMs, nowMs]);
    const isExpired = expiresAtMs !== null && expiresAtMs <= nowMs;
    const joinCommandRef = React.useRef(joinCommand);
    const expiresAtMsRef = React.useRef<number | null>(expiresAtMs);
    joinCommandRef.current = joinCommand;
    expiresAtMsRef.current = expiresAtMs;

    const refreshJoinCommand = React.useCallback(async () => {
        if (!token) {
            setJoinCommand('');
            setExpiresAt(null);
            setHasRefreshError(false);
            return fallbackCommand;
        }

        setIsRefreshing(true);
        try {
            const { ticket, expiresAt: nextExpiresAt } = await createAccountJoinTicket(token);
            const nextCommand = getCliInstallAndLoginCommand(ticket);
            setJoinCommand(nextCommand);
            setExpiresAt(nextExpiresAt);
            setNowMs(Date.now());
            setHasRefreshError(false);
            return nextCommand;
        } catch (error) {
            setHasRefreshError(true);
            const now = Date.now();
            if (joinCommandRef.current && expiresAtMsRef.current !== null && expiresAtMsRef.current > now) {
                return joinCommandRef.current;
            }

            setJoinCommand('');
            setExpiresAt(null);
            throw error instanceof Error ? error : new Error('Failed to refresh join command');
        } finally {
            setIsRefreshing(false);
        }
    }, [fallbackCommand, token]);

    const ensureFreshJoinCommand = React.useCallback(async () => {
        if (!token) {
            return fallbackCommand;
        }

        if (!joinCommand || expiresAtMs === null || expiresAtMs - Date.now() <= JOIN_TICKET_REFRESH_THRESHOLD_MS) {
            return refreshJoinCommand();
        }

        return joinCommand;
    }, [expiresAtMs, fallbackCommand, joinCommand, refreshJoinCommand, token]);

    React.useEffect(() => {
        void refreshJoinCommand();
    }, [refreshJoinCommand]);

    React.useEffect(() => {
        if (expiresAtMs === null) {
            return;
        }

        const interval = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAtMs]);

    return {
        fallbackCommand,
        primaryCommand: joinCommand || (token ? '' : fallbackCommand),
        joinCommand,
        expiresAt,
        isExpired,
        isRefreshing,
        hasRefreshError,
        secondsRemaining,
        refreshJoinCommand,
        ensureFreshJoinCommand,
    };
}
