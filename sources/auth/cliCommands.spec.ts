import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getServerUrlMock = vi.fn();

vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: getServerUrlMock,
}));

describe('getCliInstallAndLoginCommand', () => {
    beforeEach(() => {
        vi.resetModules();
        getServerUrlMock.mockReset();
        delete (globalThis as { window?: Window }).window;
    });

    afterEach(() => {
        delete (globalThis as { window?: Window }).window;
    });

    function setWindowLocation(hostname: string, origin: string) {
        Object.defineProperty(globalThis, 'window', {
            value: {
                location: {
                    hostname,
                    origin,
                },
            },
            configurable: true,
            writable: true,
        });
    }

    it('derives the command API URL from a non-default web origin when the bundle default is stale', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');
        setWindowLocation('ahaagi.com', 'https://ahaagi.com');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');

        expect(getCliInstallAndLoginCommand('7VARDB')).toBe(
            "export AHA_SERVER_URL='https://ahaagi.com/api' && npm i aha-agi && npx aha auth login --code 7VARDB",
        );
    });

    it('omits AHA_SERVER_URL for the default production API', async () => {
        getServerUrlMock.mockReturnValue('https://aha-agi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');

        expect(getCliInstallAndLoginCommand('ABC123')).toBe(
            'npm i aha-agi && npx aha auth login --code ABC123',
        );
    });

    it('includes AHA_SERVER_URL for a configured non-default API', async () => {
        getServerUrlMock.mockReturnValue('https://ahaagi.com/api');

        const { getCliInstallAndLoginCommand } = await import('./cliCommands');

        expect(getCliInstallAndLoginCommand('LEN2AF')).toBe(
            "export AHA_SERVER_URL='https://ahaagi.com/api' && npm i aha-agi && npx aha auth login --code LEN2AF",
        );
    });
});
