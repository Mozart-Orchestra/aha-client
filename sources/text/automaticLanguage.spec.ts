import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadLocalSettingsMock = vi.hoisted(() => vi.fn(() => ({})));
const saveLocalSettingsMock = vi.hoisted(() => vi.fn());
const getLocalesMock = vi.hoisted(() => vi.fn(() => [
    {
        languageCode: 'en',
        languageTag: 'en-US',
    },
]));

vi.mock('expo-localization', () => ({
    getLocales: getLocalesMock,
}));

vi.mock('@/sync/persistence', () => ({
    loadLocalSettings: loadLocalSettingsMock,
    saveLocalSettings: saveLocalSettingsMock,
}));

describe('automaticLanguage', () => {
    beforeEach(() => {
        vi.resetModules();
        loadLocalSettingsMock.mockReturnValue({});
        saveLocalSettingsMock.mockReset();
        getLocalesMock.mockReturnValue([
            {
                languageCode: 'en',
                languageTag: 'en-US',
            },
        ]);
        delete (globalThis as { window?: unknown }).window;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete (globalThis as { window?: unknown }).window;
    });

    it('skips external IP lookups in browser environments and falls back to locale', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        (globalThis as { window?: unknown }).window = {};

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            language: 'en',
            source: 'device',
            countryCode: null,
        });
        expect(saveLocalSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
            autoDetectedLanguage: 'en',
            autoDetectedLanguageSource: 'device',
            autoDetectedLanguageCountryCode: null,
        }));
    });
});
