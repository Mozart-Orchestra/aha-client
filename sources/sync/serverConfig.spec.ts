import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const originalServerEnv = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;

vi.mock('react-native-mmkv', () => ({
    MMKV: class {
        getString(key: string) {
            return storage.get(key);
        }

        set(key: string, value: string) {
            storage.set(key, value);
        }

        delete(key: string) {
            storage.delete(key);
        }
    },
}));

function setWindowLocation(hostname: string, origin?: string) {
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: {
                hostname,
                origin: origin ?? `https://${hostname}`,
                protocol: 'https:',
                host: hostname,
            },
        },
        configurable: true,
        writable: true,
    });
}

async function loadServerConfig() {
    vi.resetModules();
    return await import('./serverConfig');
}

describe('serverConfig', () => {
    beforeEach(() => {
        storage.clear();
        delete process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;
        delete (globalThis as { window?: Window }).window;
    });

    afterEach(() => {
        if (originalServerEnv) {
            process.env.EXPO_PUBLIC_HAPPY_SERVER_URL = originalServerEnv;
        } else {
            delete process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;
        }
        delete (globalThis as { window?: Window }).window;
        vi.restoreAllMocks();
    });

    it('uses the hosted default server for localhost web builds', async () => {
        setWindowLocation('localhost', 'http://localhost:8081');

        const { getServerUrl } = await loadServerConfig();

        expect(getServerUrl()).toBe('https://aha-agi.com/api');
    });

    it('uses the current public origin for hosted web builds', async () => {
        setWindowLocation('aha-agi.com', 'https://aha-agi.com');

        const { getServerUrl } = await loadServerConfig();

        expect(getServerUrl()).toBe('https://aha-agi.com/api');
    });

    it('keeps LAN auto-discovery for private IP web builds', async () => {
        setWindowLocation('192.168.1.20', 'http://192.168.1.20:8081');

        const { getServerUrl } = await loadServerConfig();

        expect(getServerUrl()).toBe('http://192.168.1.20:3005');
    });

    it('rewrites localhost env overrides to the current LAN host', async () => {
        process.env.EXPO_PUBLIC_HAPPY_SERVER_URL = 'http://localhost:3005';
        setWindowLocation('192.168.1.20', 'http://192.168.1.20:8081');

        const { getServerUrl } = await loadServerConfig();

        expect(getServerUrl()).toBe('http://192.168.1.20:3005');
    });

    it('preserves explicit custom servers', async () => {
        const { getServerUrl, isUsingCustomServer, setServerUrl } = await loadServerConfig();

        setServerUrl('https://custom.example.com');

        expect(getServerUrl()).toBe('https://custom.example.com');
        expect(isUsingCustomServer()).toBe(true);
    });

    it('ignores stale official server URLs from a different hosted deployment', async () => {
        setWindowLocation('ahaagi.com', 'https://ahaagi.com');
        const { getServerUrl, setServerUrl } = await loadServerConfig();

        setServerUrl('https://aha-agi.com/api/');

        expect(getServerUrl()).toBe('https://ahaagi.com/api');
    });
});
