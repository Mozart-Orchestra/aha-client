import * as React from 'react';
import { useSocketStatus } from '@/sync/storage';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'error';

export const RECONNECTING_BANNER_DELAY_MS = 500;

export function useConnectionStatus(): { status: ConnectionStatus; isReconnecting: boolean } {
    const socketStatus = useSocketStatus();
    const hadConnectedBefore = socketStatus.lastConnectedAt !== null;
    const shouldDebounceReconnect = hadConnectedBefore
        && (socketStatus.status === 'connecting'
            || socketStatus.status === 'disconnected'
            || socketStatus.status === 'error');

    const [showReconnectBanner, setShowReconnectBanner] = React.useState(false);

    React.useEffect(() => {
        if (!shouldDebounceReconnect) {
            setShowReconnectBanner(false);
            return;
        }

        const timeout = setTimeout(() => {
            setShowReconnectBanner(true);
        }, RECONNECTING_BANNER_DELAY_MS);

        return () => clearTimeout(timeout);
    }, [shouldDebounceReconnect, socketStatus.status, socketStatus.lastConnectedAt]);

    const status: ConnectionStatus = React.useMemo(() => {
        if (socketStatus.status === 'connected') {
            return 'connected';
        }

        if (showReconnectBanner) {
            return 'reconnecting';
        }

        if (socketStatus.status === 'error') {
            return 'error';
        }

        return 'connected';
    }, [showReconnectBanner, socketStatus.status]);

    return {
        status,
        isReconnecting: status === 'reconnecting',
    };
}
