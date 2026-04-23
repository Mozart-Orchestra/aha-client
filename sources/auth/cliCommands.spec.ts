import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServerUrlMock = vi.fn();
const originalCliServerUrlEnv = process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL;
const originalCliWebappUrlEnv = process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL;

vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: getServerUrlMock,
}));

describe('getCliInstallAndLoginCommand', () => {
    beforeEach(() => {
        vi.resetModules();
        getServerUrlMock.mockReset();
        delete process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL;
        delete process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL;
        delete (globalThis as { window?: Window }).window;
    });

    afterEach(() => {
        if (originalCliServerUrlEnv) {
            process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL = originalCliServerUrlEnv;
        } else {
            delete process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL;
        }
        if (originalCliWebappUrlEnv) {
            process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL = originalCliWebappUrlEnv;
        } else {
            delete process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL;
        }
        delete (globalThis as { window?: Window }).window;
    });

    function setWindowLocation(hostname: string, origin: string, pathname = '/webappv3/') {
        Object.defineProperty(globalThis, 'window', {
            value: {
                location: {
                    hostname,
                    origin,
                    pathname,
                },
            },
            configurable: true,
            writable: true,
        });
    }

    it('persists the command API URL from a non-default web origin when the bundle default is stale', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');
        setWindowLocation('ahaagi.com', 'https://ahaagi.com');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('7VARDB');

        expect(command).toContain('"serverUrl":"https://ahaagi.com/api"');
        expect(command).toContain('"webappUrl":"https://ahaagi.com/webappv3"');
        expect(command).toContain('npm i aha-agi && npx aha auth login --code 7VARDB');
    });

    it('uses deployment-provided CLI URLs before runtime browser inference', async () => {
        process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL = 'https://ahaagi.com/api';
        process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL = 'https://ahaagi.com/webappv3';
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');
        setWindowLocation('aha-agi.com', 'https://aha-agi.com');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('CFG123');

        expect(command).toContain('"serverUrl":"https://ahaagi.com/api"');
        expect(command).toContain('"webappUrl":"https://ahaagi.com/webappv3"');
        expect(command).toContain('npm i aha-agi && npx aha auth login --code CFG123');
    });

    it('pins an explicitly configured default deployment too', async () => {
        process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL = 'https://aha-agi.com/api';
        process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL = 'https://aha-agi.com/webappv3';
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('PINDEF');

        expect(command).toContain('"serverUrl":"https://aha-agi.com/api"');
        expect(command).toContain('"webappUrl":"https://aha-agi.com/webappv3"');
        expect(command).toContain('npm i aha-agi && npx aha auth login --code PINDEF');
    });

    it('omits AHA_SERVER_URL for the default production API', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');

        expect(getCliInstallAndLoginCommand('ABC123')).toBe(
            'npm i aha-agi && npx aha auth login --code ABC123',
        );
    });

    it('persists configured non-default API URLs for future CLI runs', async () => {
        getServerUrlMock.mockReturnValue('https://ahaagi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('LEN2AF');

        expect(command).toContain('"serverUrl":"https://ahaagi.com/api"');
        expect(command).toContain('"webappUrl":"https://ahaagi.com/webappv3"');
        expect(command).toContain('npm i aha-agi && npx aha auth login --code LEN2AF');
    });
});
