const PENDING_TERMINAL_CONNECT_REQUEST_KEY = 'pending-terminal-connect-request';

export function hasPendingTerminalConnectRequest(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return !!window.sessionStorage.getItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY);
}

export function readPendingTerminalConnectRequestStorage(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.sessionStorage.getItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY);
}

export function persistPendingTerminalConnectRequestStorage(value: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY, value);
}

export function clearPendingTerminalConnectRequestStorage(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(PENDING_TERMINAL_CONNECT_REQUEST_KEY);
}
