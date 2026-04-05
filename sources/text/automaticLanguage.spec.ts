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

// Default: no window (native/Node environment)
beforeEach(() => {
    vi.resetModules();
    loadLocalSettingsMock.mockReturnValue({});
    saveLocalSettingsMock.mockReset();
    getLocalesMock.mockReturnValue([{ languageCode: 'en', languageTag: 'en-US' }]);
    delete (globalThis as { window?: unknown }).window;
});

afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as { window?: unknown }).window;
});

// ─── resolveAutomaticLanguageFromLocale ──────────────────────────────────────

describe('resolveAutomaticLanguageFromLocale', () => {
    it('returns en for English locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'en', languageTag: 'en-US' } as any])).toBe('en');
    });

    it('returns zh-Hans for zh languageCode', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'zh', languageTag: 'zh-CN' } as any])).toBe('zh-Hans');
    });

    it('returns zh-Hans for zh-Hant languageTag', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'zh', languageTag: 'zh-Hant-TW' } as any])).toBe('zh-Hans');
    });

    it('returns ru for Russian locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'ru', languageTag: 'ru-RU' } as any])).toBe('ru');
    });

    it('returns pl for Polish locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'pl', languageTag: 'pl-PL' } as any])).toBe('pl');
    });

    it('returns es for Spanish locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'es', languageTag: 'es-ES' } as any])).toBe('es');
    });

    it('returns pt for Portuguese locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'pt', languageTag: 'pt-BR' } as any])).toBe('pt');
    });

    it('returns ca for Catalan locale', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'ca', languageTag: 'ca-ES' } as any])).toBe('ca');
    });

    it('returns en for unsupported locale (Japanese)', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([{ languageCode: 'ja', languageTag: 'ja-JP' } as any])).toBe('en');
    });

    it('returns en for empty locale list', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        expect(resolveAutomaticLanguageFromLocale([])).toBe('en');
    });

    it('returns first matching language when multiple locales are present', async () => {
        const { resolveAutomaticLanguageFromLocale } = await import('./automaticLanguage');
        const locales = [
            { languageCode: 'ru', languageTag: 'ru-RU' },
            { languageCode: 'en', languageTag: 'en-US' },
        ] as any[];
        expect(resolveAutomaticLanguageFromLocale(locales)).toBe('ru');
    });
});

// ─── refreshAutomaticLanguagePreference (native / non-browser) ───────────────

describe('refreshAutomaticLanguagePreference – native (no window)', () => {
    it('returns cached language without network call when cache is fresh', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const now = Date.now();
        loadLocalSettingsMock.mockReturnValue({
            autoDetectedLanguage: 'zh-Hans',
            autoDetectedLanguageSource: 'ip',
            autoDetectedLanguageCountryCode: 'CN',
            autoDetectedLanguageUpdatedAt: now - 1000, // 1 second ago — well within 24 h
        });

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({ language: 'zh-Hans', source: 'ip', countryCode: 'CN' });
    });

    it('uses supported device locale directly without IP lookup', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ru', languageTag: 'ru-RU' }]);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            language: 'ru',
            source: 'device',
            countryCode: null,
        });
    });

    it('performs IP lookup when locale is unsupported and returns ip-based language', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ country_code: 'CN' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        loadLocalSettingsMock.mockReturnValue({
            autoDetectedLanguage: 'en',
            autoDetectedLanguageSource: 'ip',
            autoDetectedLanguageCountryCode: 'US',
            autoDetectedLanguageUpdatedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 h ago
        });

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(result.language).toBe('zh-Hans');
        expect(result.source).toBe('ip');
        expect(result.countryCode).toBe('CN');
        expect(saveLocalSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
            autoDetectedLanguage: 'zh-Hans',
            autoDetectedLanguageSource: 'ip',
            autoDetectedLanguageCountryCode: 'CN',
        }));
    });

    it('falls back to second IP endpoint when first fails', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ countryCode: 'HK' }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(result.language).toBe('zh-Hans');
        expect(result.countryCode).toBe('HK');
    });

    it('falls back to device locale when all IP endpoints fail', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(result.language).toBe('en');
        expect(result.source).toBe('device');
        expect(result.countryCode).toBeNull();
    });

    it('maps non-Chinese country code to en', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ country_code: 'DE' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference();

        expect(result.language).toBe('en');
        expect(result.source).toBe('ip');
        expect(result.countryCode).toBe('DE');
    });
});

// ─── refreshAutomaticLanguagePreference (web / browser) ──────────────────────

describe('refreshAutomaticLanguagePreference – web (window present)', () => {
    beforeEach(() => {
        (globalThis as { window?: unknown }).window = {};
    });

    it('skips external IP lookups and uses supported browser language directly', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'pl', languageTag: 'pl-PL' }]);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference('https://example.com/v1/geo/country-code');

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            language: 'pl',
            source: 'device',
            countryCode: null,
        });
        expect(saveLocalSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
            autoDetectedLanguage: 'pl',
            autoDetectedLanguageSource: 'device',
            autoDetectedLanguageCountryCode: null,
        }));
    });

    it('uses server proxy to resolve language from IP in browser', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ countryCode: 'SG' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference('https://ahaagi.com/api/v3/v1/geo/country-code');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://ahaagi.com/api/v3/v1/geo/country-code',
            expect.objectContaining({ headers: { Accept: 'application/json' } })
        );
        expect(result.language).toBe('zh-Hans');
        expect(result.source).toBe('ip');
        expect(result.countryCode).toBe('SG');
    });

    it('falls back to default English when proxy returns no country code and locale is unsupported', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ countryCode: null }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference('https://example.com/v1/geo/country-code');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.language).toBe('en');
        expect(result.source).toBe('device');
    });

    it('falls back to default English when proxy call fails and locale is unsupported', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'ja', languageTag: 'ja-JP' }]);
        const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network error'));
        vi.stubGlobal('fetch', fetchMock);

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference('https://example.com/v1/geo/country-code');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.language).toBe('en');
        expect(result.source).toBe('device');
    });

    it('returns cached value in browser without any fetch call', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        loadLocalSettingsMock.mockReturnValue({
            autoDetectedLanguage: 'zh-Hans',
            autoDetectedLanguageSource: 'ip',
            autoDetectedLanguageCountryCode: 'TW',
            autoDetectedLanguageUpdatedAt: Date.now() - 1000,
        });

        const { refreshAutomaticLanguagePreference } = await import('./automaticLanguage');
        const result = await refreshAutomaticLanguagePreference('https://example.com/v1/geo/country-code');

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.language).toBe('zh-Hans');
    });
});

// ─── getCachedAutomaticLanguage ───────────────────────────────────────────────

describe('getCachedAutomaticLanguage', () => {
    it('returns cached language when present and valid', async () => {
        loadLocalSettingsMock.mockReturnValue({ autoDetectedLanguage: 'ru' });
        const { getCachedAutomaticLanguage } = await import('./automaticLanguage');
        expect(getCachedAutomaticLanguage()).toBe('ru');
    });

    it('returns locale-derived language when cache is empty', async () => {
        getLocalesMock.mockReturnValue([{ languageCode: 'pt', languageTag: 'pt-PT' }]);
        loadLocalSettingsMock.mockReturnValue({});
        const { getCachedAutomaticLanguage } = await import('./automaticLanguage');
        expect(getCachedAutomaticLanguage()).toBe('pt');
    });

    it('ignores invalid cached language value and falls back to locale', async () => {
        loadLocalSettingsMock.mockReturnValue({ autoDetectedLanguage: 'klingon' });
        getLocalesMock.mockReturnValue([{ languageCode: 'ca', languageTag: 'ca-ES' }]);
        const { getCachedAutomaticLanguage } = await import('./automaticLanguage');
        expect(getCachedAutomaticLanguage()).toBe('ca');
    });
});
