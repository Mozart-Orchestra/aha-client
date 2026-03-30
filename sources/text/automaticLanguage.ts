import * as Localization from 'expo-localization';

import type { LocalSettings } from '@/sync/localSettings';
import { loadLocalSettings, saveLocalSettings } from '@/sync/persistence';

import type { SupportedLanguage } from './_all';

export const PRIMARY_LANGUAGE_CODES = ['en', 'zh-Hans'] as const;

export type AutomaticLanguage = (typeof PRIMARY_LANGUAGE_CODES)[number];
export type AutomaticLanguageSource = 'ip' | 'device';

const CHINESE_REGION_CODES = new Set(['CN', 'SG', 'HK', 'MO', 'TW']);
const AUTO_LANGUAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IP_LOOKUP_TIMEOUT_MS = 2500;

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

function shouldSkipIpLookup(): boolean {
    // Direct browser calls to third-party IP services are frequently blocked by CORS.
    // Use deterministic locale fallback for web/local flows instead of surfacing console noise.
    return typeof window !== 'undefined';
}

function normalizeAutomaticLanguage(value: string | null | undefined): AutomaticLanguage | null {
    return value === 'en' || value === 'zh-Hans' ? value : null;
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

export function resolveAutomaticLanguageFromLocale(
    locales: readonly Localization.Locale[] = Localization.getLocales()
): AutomaticLanguage {
    for (const locale of locales) {
        const languageCode = locale.languageCode?.toLowerCase();
        const languageTag = locale.languageTag?.toLowerCase();

        if (languageCode === 'zh' || languageTag?.startsWith('zh')) {
            return 'zh-Hans';
        }
    }

    return 'en';
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

export async function refreshAutomaticLanguagePreference() {
    const localSettings = loadLocalSettings();
    const cached = getAutomaticLanguageSnapshot(localSettings);

    if (cached.updatedAt && Date.now() - cached.updatedAt < AUTO_LANGUAGE_CACHE_TTL_MS) {
        return {
            language: cached.language,
            source: cached.source,
            countryCode: cached.countryCode,
        };
    }

    const localeLanguage = resolveAutomaticLanguageFromLocale();

    if (shouldSkipIpLookup()) {
        persistAutomaticLanguage(localeLanguage, 'device', null);
        return {
            language: localeLanguage,
            source: 'device' as const,
            countryCode: null,
        };
    }

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
