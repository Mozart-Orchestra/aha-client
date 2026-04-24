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

    it('pins the command API URL from a non-default web origin when the bundle default is stale', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');
        setWindowLocation('preview.aha-agi.com', 'https://preview.aha-agi.com');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('7VARDB');

        expect(command).toBe('npm i aha-agi && npx aha auth login --server-url https://preview.aha-agi.com/api --webapp-url https://preview.aha-agi.com/webappv3 --code 7VARDB');
    });

    it('uses deployment-provided CLI URLs before runtime browser inference', async () => {
        process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL = 'https://preview.aha-agi.com/api';
        process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL = 'https://preview.aha-agi.com/webappv3';
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');
        setWindowLocation('aha-agi.com', 'https://aha-agi.com');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('CFG123');

        expect(command).toBe('npm i aha-agi && npx aha auth login --server-url https://preview.aha-agi.com/api --webapp-url https://preview.aha-agi.com/webappv3 --code CFG123');
    });

    it('pins an explicitly configured default deployment too', async () => {
        process.env.EXPO_PUBLIC_AHA_CLI_SERVER_URL = 'https://aha-agi.com/api';
        process.env.EXPO_PUBLIC_AHA_CLI_WEBAPP_URL = 'https://aha-agi.com/webappv3';
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('PINDEF');

        expect(command).toBe('npm i aha-agi && npx aha auth login --server-url https://aha-agi.com/api --webapp-url https://aha-agi.com/webappv3 --code PINDEF');
    });

    it('omits AHA_SERVER_URL for the default production API', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');

        expect(getCliInstallAndLoginCommand('ABC123')).toBe(
            'npm i aha-agi && npx aha auth login --code ABC123',
        );
    });

    it('pins configured non-default API URLs for future CLI runs', async () => {
        getServerUrlMock.mockReturnValue('https://preview.aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');
        const command = getCliInstallAndLoginCommand('LEN2AF');

        expect(command).toBe('npm i aha-agi && npx aha auth login --server-url https://preview.aha-agi.com/api --webapp-url https://preview.aha-agi.com/webappv3 --code LEN2AF');
    });

    it('formats the pinned command as readable copy steps', async () => {
        const { formatCliInstallCommandForDisplay } = await import('./cliCommands');

        expect(formatCliInstallCommandForDisplay('npm i aha-agi && npx aha auth login --server-url https://preview.aha-agi.com/api --webapp-url https://preview.aha-agi.com/webappv3 --code LEN2AF')).toBe([
            'npm i aha-agi',
            'npx aha auth login',
            '  --server-url https://preview.aha-agi.com/api',
            '  --webapp-url https://preview.aha-agi.com/webappv3',
            '  --code LEN2AF',
        ].join('\n'));
    });
});
