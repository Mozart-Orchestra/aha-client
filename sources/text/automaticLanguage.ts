import * as Localization from 'expo-localization';

import type { LocalSettings } from '@/sync/localSettings';
import { loadLocalSettings, saveLocalSettings } from '@/sync/persistence';

import { type SupportedLanguage, SUPPORTED_LANGUAGE_CODES } from './_all';

export type AutomaticLanguage = SupportedLanguage;
export type AutomaticLanguageSource = 'ip' | 'device';

const CHINESE_REGION_CODES = new Set(['CN', 'SG', 'HK', 'MO', 'TW']);
const AUTO_LANGUAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IP_LOOKUP_TIMEOUT_MS = 2500;

/**
 * Locale prefix → SupportedLanguage mapping for browser/device locale detection.
 * Order matters: more specific prefixes should appear before less specific ones.
 * 'zh' must be handled separately because its tag is 'zh-Hans', not just 'zh'.
 */
const LOCALE_PREFIX_MAP: Array<[prefix: string, language: SupportedLanguage]> = [
    ['zh', 'zh-Hans'],
    ['ru', 'ru'],
    ['pl', 'pl'],
    ['es', 'es'],
    ['pt', 'pt'],
    ['ca', 'ca'],
    ['en', 'en'],
];

const IP_LOOKUP_ENDPOINTS = [
    {
        url: 'https://ipapi.co/json/',
        pickCountryCode: (payload: any) => payload?.country_code ?? payload?.country ?? null,
    },
    {
        url: 'https://api.ipwho.org/me',
        pickCountryCode: (payload: any) => payload?.countryCode ?? payload?.country_code ?? null,
    },
] as const;

function normalizeAutomaticLanguage(value: string | null | undefined): AutomaticLanguage | null {
    if (!value) {
        return null;
    }
    return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value)
        ? (value as AutomaticLanguage)
        : null;
}

function normalizeCountryCode(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toUpperCase();
    return normalized.length >= 2 ? normalized : null;
}

function mapCountryCodeToLanguage(countryCode: string | null): AutomaticLanguage | null {
    if (!countryCode) {
        return null;
    }

    return CHINESE_REGION_CODES.has(countryCode) ? 'zh-Hans' : 'en';
}

function persistAutomaticLanguage(
    language: AutomaticLanguage,
    source: AutomaticLanguageSource,
    countryCode: string | null
) {
    const nextSettings: LocalSettings = {
        ...loadLocalSettings(),
        autoDetectedLanguage: language,
        autoDetectedLanguageSource: source,
        autoDetectedLanguageCountryCode: countryCode,
        autoDetectedLanguageUpdatedAt: Date.now(),
    };

    saveLocalSettings(nextSettings);
}

async function fetchJsonWithTimeout(url: string): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Try to resolve country code via a same-origin server proxy.
 * This avoids CORS issues that affect direct third-party IP API calls from browsers.
 * The server reads the client IP from request headers and returns only the country code.
 */
async function fetchCountryCodeViaProxy(proxyUrl: string): Promise<string | null> {
    const payload = await fetchJsonWithTimeout(proxyUrl);
    return normalizeCountryCode(payload?.countryCode);
}

/**
 * Resolve language from device/browser locales.
 * Maps all supported language prefixes; defaults to 'en' if no match is found.
 */
function resolveAutomaticLanguageMatchFromLocale(
    locales: readonly Localization.Locale[] = Localization.getLocales()
): AutomaticLanguage | null {
    for (const locale of locales) {
        const languageCode = locale.languageCode?.toLowerCase() ?? '';
        const languageTag = locale.languageTag?.toLowerCase() ?? '';

        for (const [prefix, language] of LOCALE_PREFIX_MAP) {
            if (languageCode === prefix || languageTag.startsWith(prefix)) {
                return language;
            }
        }
    }

    return null;
}

/**
 * Resolve language from device/browser locales.
 * Maps all supported language prefixes; defaults to 'en' if no match is found.
 */
export function resolveAutomaticLanguageFromLocale(
    locales: readonly Localization.Locale[] = Localization.getLocales()
): AutomaticLanguage {
    return resolveAutomaticLanguageMatchFromLocale(locales) ?? 'en';
}

export function getAutomaticLanguageSnapshot(localSettings: LocalSettings = loadLocalSettings()) {
    const cachedLanguage = normalizeAutomaticLanguage(localSettings.autoDetectedLanguage);

    return {
        language: cachedLanguage ?? resolveAutomaticLanguageFromLocale(),
        source: localSettings.autoDetectedLanguageSource ?? 'device',
        countryCode: localSettings.autoDetectedLanguageCountryCode ?? null,
        updatedAt: localSettings.autoDetectedLanguageUpdatedAt ?? null,
    };
}

export function getCachedAutomaticLanguage(localSettings: LocalSettings = loadLocalSettings()): AutomaticLanguage {
    return getAutomaticLanguageSnapshot(localSettings).language;
}

export function resolvePreferredLanguage(
    preferredLanguage: string | null | undefined,
    localSettings: LocalSettings = loadLocalSettings()
): SupportedLanguage {
    if (preferredLanguage) {
        return preferredLanguage as SupportedLanguage;
    }

    return getCachedAutomaticLanguage(localSettings);
}

/**
 * Refresh the automatically detected language.
 *
 * Strategy:
 * - Cache hit (< 24 h): return cached value.
 * - Supported browser/device locale: use it directly.
 * - Web environment: call server proxy `/v1/geo/country-code` to avoid CORS;
 *   falls back to device locale/default English if the proxy is unavailable.
 * - Native environment: call third-party IP APIs directly.
 * - All IP lookups fall back to device locale/default English on failure.
 */
export async function refreshAutomaticLanguagePreference(
    /** Override the server proxy URL (used in tests). Pass null to skip proxy. */
    geoProxyUrl?: string | null
) {
    const localSettings = loadLocalSettings();
    const cached = getAutomaticLanguageSnapshot(localSettings);

    if (cached.updatedAt && Date.now() - cached.updatedAt < AUTO_LANGUAGE_CACHE_TTL_MS) {
        return {
            language: cached.language,
            source: cached.source,
            countryCode: cached.countryCode,
        };
    }

    const localeLanguageMatch = resolveAutomaticLanguageMatchFromLocale();
    const localeLanguage = localeLanguageMatch ?? 'en';

    if (localeLanguageMatch) {
        persistAutomaticLanguage(localeLanguageMatch, 'device', null);
        return {
            language: localeLanguageMatch,
            source: 'device' as const,
            countryCode: null,
        };
    }

    // --- Web environment ---
    // Direct calls to third-party IP services are blocked by CORS in browsers.
    // Use a same-origin server proxy instead.
    if (typeof window !== 'undefined') {
        const proxyUrl = geoProxyUrl !== undefined
            ? geoProxyUrl
            : (() => {
                try {
                    // Lazy import to avoid circular module issues at module load time.
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const { getServerUrl } = require('@/sync/serverConfig') as { getServerUrl: () => string };
                    return `${getServerUrl()}/v1/geo/country-code`;
                } catch {
                    return null;
                }
            })();

        if (proxyUrl) {
            const countryCode = await fetchCountryCodeViaProxy(proxyUrl);
            const language = mapCountryCodeToLanguage(countryCode) ?? localeLanguage;
            const source: AutomaticLanguageSource = countryCode ? 'ip' : 'device';
            persistAutomaticLanguage(language, source, countryCode);
            return { language, source, countryCode };
        }

        // No proxy available — fall back to device locale.
        persistAutomaticLanguage(localeLanguage, 'device', null);
        return { language: localeLanguage, source: 'device' as const, countryCode: null };
    }

    // --- Native environment ---
    // Call third-party IP APIs directly (no CORS restrictions).
    for (const endpoint of IP_LOOKUP_ENDPOINTS) {
        const payload = await fetchJsonWithTimeout(endpoint.url);
        const countryCode = normalizeCountryCode(endpoint.pickCountryCode(payload));
        const language = mapCountryCodeToLanguage(countryCode);

        if (!language) {
            continue;
        }

        persistAutomaticLanguage(language, 'ip', countryCode);
        return {
            language,
            source: 'ip' as const,
            countryCode,
        };
    }

    persistAutomaticLanguage(localeLanguage, 'device', null);
    return {
        language: localeLanguage,
        source: 'device' as const,
        countryCode: null,
    };
}
