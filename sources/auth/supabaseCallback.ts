export interface SupabaseOAuthCallbackState {
    accessToken: string | null;
    refreshToken: string | null;
    error: string | null;
    errorCode: string | null;
    errorDescription: string | null;
}

type RedirectLocationLike = {
    href?: string;
    origin?: string;
    pathname?: string;
    search?: string;
};

type HistoryLike = {
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
};

type LocationLike = {
    pathname: string;
    search: string;
};

function decodeHashValue(value: string | null): string | null {
    if (!value) {
        return null;
    }

    let decoded = value.replace(/\+/g, ' ');
    for (let i = 0; i < 2; i += 1) {
        try {
            const next = decodeURIComponent(decoded);
            if (next === decoded) {
                break;
            }
            decoded = next;
        } catch {
            break;
        }
    }

    return decoded;
}

export function getWebSupabaseRedirectUrl(locationLike?: RedirectLocationLike | null): string | null {
    const source = locationLike ?? (typeof window !== 'undefined' ? window.location : null);
    if (!source) {
        return null;
    }

    if (source.href) {
        const url = new URL(source.href);
        url.hash = '';
        return url.toString();
    }

    if (!source.origin || !source.pathname) {
        return null;
    }

    return `${source.origin}${source.pathname}${source.search ?? ''}`;
}

export function getWebSupabaseOAuthOrigin(locationLike?: RedirectLocationLike | null): string | null {
    const source = locationLike ?? (typeof window !== 'undefined' ? window.location : null);
    if (!source) {
        return null;
    }

    const href = source.href
        ?? (source.origin && source.pathname
            ? `${source.origin}${source.pathname}${source.search ?? ''}`
            : null);
    if (!href) {
        return null;
    }

    const url = new URL(href);
    const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    if (!isLocalHost && url.hostname.startsWith('www.')) {
        url.hostname = url.hostname.slice(4);
    }

    if (!isLocalHost && url.protocol === 'http:') {
        url.protocol = 'https:';
        if (url.port === '80') {
            url.port = '';
        }
    }

    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
}

export function readSupabaseOAuthCallbackState(hash: string | null | undefined): SupabaseOAuthCallbackState | null {
    if (!hash || !hash.startsWith('#')) {
        return null;
    }

    const params = new URLSearchParams(hash.slice(1));
    const state: SupabaseOAuthCallbackState = {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        error: decodeHashValue(params.get('error')),
        errorCode: decodeHashValue(params.get('error_code')),
        errorDescription: decodeHashValue(params.get('error_description')),
    };

    if (!state.accessToken && !state.refreshToken && !state.error && !state.errorCode && !state.errorDescription) {
        return null;
    }

    return state;
}

export function clearSupabaseOAuthCallbackHash(
    historyLike?: HistoryLike | null,
    locationLike?: LocationLike | null,
): void {
    const historyTarget = historyLike ?? (typeof window !== 'undefined' ? window.history : null);
    const locationTarget = locationLike ?? (typeof window !== 'undefined' ? window.location : null);

    if (!historyTarget || !locationTarget) {
        return;
    }

    historyTarget.replaceState(null, '', `${locationTarget.pathname}${locationTarget.search}`);
}
