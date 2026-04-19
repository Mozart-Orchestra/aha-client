import { MMKV } from 'react-native-mmkv';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const DEFAULT_SERVER_URL = 'https://aha-agi.com/api';
const DEFAULT_PUBLIC_API_PATH = '/api';

function isLocalHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getWindowOrigin(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const origin = typeof window.location.origin === 'string' ? window.location.origin.trim() : '';
    if (origin) {
        return origin.replace(/\/+$/, '');
    }

    const protocol = typeof window.location.protocol === 'string' ? window.location.protocol : '';
    const host = typeof window.location.host === 'string' ? window.location.host : '';
    if (!protocol || !host) {
        return null;
    }

    return `${protocol}//${host}`.replace(/\/+$/, '');
}

function getRuntimeServerUrl(): string | null {
    const envServerUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL?.trim();
    if (envServerUrl) {
        // 当页面从局域网 IP 访问时，将 env 里的 localhost 地址重写为页面主机
        return rewriteLocalhostUrl(envServerUrl);
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Avoid forcing web localhost builds onto a local API server. Web dev can
        // still opt into localhost explicitly via env or the server settings UI.
        if (isPrivateIp(hostname)) {
            return `http://${hostname}:3005`;
        }

        if (!isLocalHost(hostname)) {
            const origin = getWindowOrigin();
            if (origin) {
                return `${origin}${DEFAULT_PUBLIC_API_PATH}`;
            }
        }
    }

    return null;
}

function isPrivateIp(hostname: string): boolean {
    return (
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
}

export function getServerUrl(): string {
    const storedServerUrl = serverConfigStorage.getString(SERVER_KEY)?.trim();
    if (storedServerUrl && storedServerUrl !== DEFAULT_SERVER_URL) {
        return rewriteLocalhostUrl(storedServerUrl);
    }

    return getRuntimeServerUrl() || DEFAULT_SERVER_URL;
}

/**
 * When the stored server URL uses localhost but the app is accessed from a
 * non-localhost host (e.g. a phone connecting to the dev machine over LAN),
 * replace localhost with the current page hostname so requests reach the
 * correct machine instead of the device's own loopback.
 */
function rewriteLocalhostUrl(url: string): string {
    if (typeof window === 'undefined') {
        return url;
    }

    const pageHost = window.location.hostname;
    if (isLocalHost(pageHost)) {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            parsed.hostname = pageHost;
            return parsed.toString().replace(/\/$/, '');
        }
    } catch {
        // fall through
    }

    return url;
}

export function setServerUrl(url: string | null): void {
    if (url && url.trim()) {
        serverConfigStorage.set(SERVER_KEY, url.trim());
    } else {
        serverConfigStorage.delete(SERVER_KEY);
    }
}

export function isUsingCustomServer(): boolean {
    const storedServerUrl = serverConfigStorage.getString(SERVER_KEY)?.trim();
    return !!storedServerUrl && storedServerUrl !== DEFAULT_SERVER_URL;
}

export function getServerInfo(): { hostname: string; port?: number; isCustom: boolean } {
    const url = getServerUrl();
    const isCustom = isUsingCustomServer();
    
    try {
        const parsed = new URL(url);
        const port = parsed.port ? parseInt(parsed.port) : undefined;
        return {
            hostname: parsed.hostname,
            port,
            isCustom
        };
    } catch {
        // Fallback if URL parsing fails
        return {
            hostname: url,
            port: undefined,
            isCustom
        };
    }
}

export function validateServerUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: false, error: 'Server URL cannot be empty' };
    }
    
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'Server URL must use HTTP or HTTPS protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}
