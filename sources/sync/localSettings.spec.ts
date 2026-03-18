import { describe, expect, it } from 'vitest';

import { applyLocalSettings, localSettingsDefaults, localSettingsParse } from './localSettings';

describe('localSettings', () => {
    it('provides sensible defaults for an empty input', () => {
        const parsed = localSettingsParse({});
        expect(parsed.debugMode).toBe(false);
        expect(parsed.acknowledgedCliVersions).toEqual({});
    });

    it('merges partial settings into defaults', () => {
        const updated = applyLocalSettings(localSettingsDefaults, {
            debugMode: true,
        });
        expect(updated.debugMode).toBe(true);
        expect(updated.themePreference).toBe('light');
    });
});
