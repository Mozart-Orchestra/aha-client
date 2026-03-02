import { MMKV } from 'react-native-mmkv';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const LEGACY_V1_SERVER_URL = 'https://top1vibe.com';

function isWebappV2Route(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    return window.location.pathname.startsWith('/webappv2');
}

function getDefaultServerUrl(): string {
    const v1Default =
        process.env.EXPO_PUBLIC_AHA_SERVER_URL_V1 ||
        process.env.EXPO_PUBLIC_AHA_SERVER_URL ||
        LEGACY_V1_SERVER_URL;
    const v2Default =
        process.env.EXPO_PUBLIC_AHA_SERVER_URL_V2 ||
        process.env.EXPO_PUBLIC_AHA_SERVER_URL ||
        'https://top1vibe.com/api/v2';

    return isWebappV2Route() ? v2Default : v1Default;
}

export function getServerUrl(): string {
    const storedUrl = serverConfigStorage.getString(SERVER_KEY)?.trim();

    // Avoid reusing legacy v1 sticky config when loading the v2 web app route.
    if (storedUrl) {
        if (isWebappV2Route() && storedUrl === LEGACY_V1_SERVER_URL) {
            return getDefaultServerUrl();
        }
        return storedUrl;
    }

    return getDefaultServerUrl();
}

export function setServerUrl(url: string | null): void {
    if (url && url.trim()) {
        serverConfigStorage.set(SERVER_KEY, url.trim());
    } else {
        serverConfigStorage.delete(SERVER_KEY);
    }
}

export function isUsingCustomServer(): boolean {
    return getServerUrl() !== getDefaultServerUrl();
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
