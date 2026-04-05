import * as z from 'zod';

//
// Schema
//

const ThemePreferenceSchema = z.preprocess(
    (value) => value === 'adaptive' ? 'light' : value,
    z.enum(['light', 'dark'])
);

const AutomaticLanguageSchema = z.enum(['en', 'ru', 'pl', 'es', 'pt', 'ca', 'zh-Hans']);
const AutomaticLanguageSourceSchema = z.enum(['ip', 'device']);

export const LocalSettingsSchema = z.object({
    // Developer settings (device-specific)
    debugMode: z.boolean().describe('Enable debug logging'),
    devModeEnabled: z.boolean().describe('Enable developer menu in settings'),
    commandPaletteEnabled: z.boolean().describe('Enable CMD+K command palette (web only)'),
    themePreference: ThemePreferenceSchema.describe('Theme preference: light or dark'),
    autoDetectedLanguage: AutomaticLanguageSchema.nullable().describe('Last automatically detected app language'),
    autoDetectedLanguageSource: AutomaticLanguageSourceSchema.nullable().describe('Source for automatic language detection'),
    autoDetectedLanguageCountryCode: z.string().nullable().describe('Country code used for automatic language detection'),
    autoDetectedLanguageUpdatedAt: z.number().nullable().describe('Timestamp of the last automatic language detection'),
    markdownCopyV2: z.boolean().describe('Replace native paragraph selection with long-press modal for full markdown copy'),
    // CLI version acknowledgments - keyed by machineId
    acknowledgedCliVersions: z.record(z.string(), z.string()).describe('Acknowledged CLI versions per machine'),
});

//
// NOTE: Local settings are device-specific and should NOT be synced.
// These are preferences that make sense to be different on each device.
//

const LocalSettingsSchemaPartial = LocalSettingsSchema.loose().partial();

export type LocalSettings = z.infer<typeof LocalSettingsSchema>;

//
// Defaults
//

export const localSettingsDefaults: LocalSettings = {
    debugMode: false,
    devModeEnabled: false,
    commandPaletteEnabled: false,
    themePreference: 'light',
    autoDetectedLanguage: null,
    autoDetectedLanguageSource: null,
    autoDetectedLanguageCountryCode: null,
    autoDetectedLanguageUpdatedAt: null,
    markdownCopyV2: false,
    acknowledgedCliVersions: {},
};
Object.freeze(localSettingsDefaults);

//
// Parsing
//

export function localSettingsParse(settings: unknown): LocalSettings {
    const parsed = LocalSettingsSchemaPartial.safeParse(settings);
    if (!parsed.success) {
        return { ...localSettingsDefaults };
    }
    return { ...localSettingsDefaults, ...parsed.data };
}

//
// Applying changes
//

export function applyLocalSettings(settings: LocalSettings, delta: Partial<LocalSettings>): LocalSettings {
    return { ...localSettingsDefaults, ...settings, ...delta };
}
