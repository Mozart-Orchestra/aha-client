import axios, { AxiosHeaders } from 'axios';
import { withAhaTraceHeaders } from './traceContext';

const FETCH_INSTALL_FLAG = '__ahaFetchTraceInstalled';
const AXIOS_INSTALL_FLAG = '__ahaAxiosTraceInstalled';

type TraceableGlobal = typeof globalThis & {
    [FETCH_INSTALL_FLAG]?: boolean;
    [AXIOS_INSTALL_FLAG]?: boolean;
};

function requestHeaders(input: RequestInfo | URL, init?: RequestInit): HeadersInit | undefined {
    if (init?.headers) {
        return init.headers;
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
        return input.headers;
    }
    return undefined;
}

function getInputUrl(input: RequestInfo | URL): string | null {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
        return input.url;
    }
    return null;
}

function getBaseOrigin(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return 'http://localhost';
}

function shouldTraceUrl(rawUrl: string | null): boolean {
    if (!rawUrl) {
        return false;
    }

    try {
        const url = new URL(rawUrl, getBaseOrigin());
        const host = url.hostname.toLowerCase();
        const path = url.pathname;
        const isKnownAhaHost = host === 'localhost'
            || host === '127.0.0.1'
            || host.endsWith('aha-agi.com')
            || host.endsWith('aha.engineering')
            || host.endsWith('aha-agi.com');
        const isKnownAhaPort = url.port === '3005' || url.port === '3006';
        const isKnownAhaPath = path.startsWith('/api/v1/')
            || path === '/api/v1'
            || path.startsWith('/v1/')
            || path === '/v1'
            || path.startsWith('/genomes')
            || path.startsWith('/genome/genomes')
            || path.startsWith('/entities')
            || path.startsWith('/genome/entities')
            || path.startsWith('/corps')
            || path.startsWith('/genome/corps')
            || path.startsWith('/permissions')
            || path.startsWith('/genome/permissions')
            || path.startsWith('/blobs')
            || path.startsWith('/genome/blobs')
            || path.startsWith('/trials')
            || path.startsWith('/genome/trials');

        return isKnownAhaPath && (isKnownAhaHost || isKnownAhaPort || rawUrl.startsWith('/'));
    } catch {
        return false;
    }
}

function getAxiosUrl(url?: string, baseURL?: string): string | null {
    if (!url) {
        return null;
    }
    if (!baseURL) {
        return url;
    }
    try {
        return new URL(url, baseURL).toString();
    } catch {
        return url;
    }
}

export function installAhaFetchTrace(): void {
    const target = globalThis as TraceableGlobal;
    if (target[FETCH_INSTALL_FLAG] || typeof target.fetch !== 'function') {
        return;
    }

    const originalFetch = target.fetch.bind(target);
    target[FETCH_INSTALL_FLAG] = true;

    target.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (!shouldTraceUrl(getInputUrl(input))) {
            return originalFetch(input, init);
        }

        const headers = withAhaTraceHeaders(requestHeaders(input, init));
        return originalFetch(input, {
            ...init,
            headers,
        });
    };
}

export function installAhaAxiosTrace(): void {
    const target = globalThis as TraceableGlobal;
    if (target[AXIOS_INSTALL_FLAG]) {
        return;
    }
    target[AXIOS_INSTALL_FLAG] = true;

    axios.interceptors.request.use((config) => {
        if (!shouldTraceUrl(getAxiosUrl(config.url, config.baseURL))) {
            return config;
        }

        const headers = AxiosHeaders.from(config.headers);
        const traced = withAhaTraceHeaders(headers.toJSON() as Record<string, string>);
        config.headers = AxiosHeaders.from(traced);
        return config;
    });
}

installAhaFetchTrace();
installAhaAxiosTrace();
