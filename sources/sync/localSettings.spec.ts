import { describe, expect, it } from 'vitest';

import { applyLocalSettings, localSettingsDefaults, localSettingsParse } from './localSettings';

describe('localSettings', () => {
    it('provides a default empty team workspace preference map', () => {
        expect(localSettingsParse({})).toMatchObject({
            teamWorkspacePreferences: {},
        });
    });

    it('parses persisted team workspace preferences', () => {
        const parsed = localSettingsParse({
            teamWorkspacePreferences: {
                'team-1': {
                    mode: 'matrix',
                    standardTab: 'chat',
                    matrixGrid: { cols: 3, rows: 3 },
                    matrixTasksVisible: true,
                    updatedAt: 123,
                },
            },
        });

        expect(parsed.teamWorkspacePreferences['team-1']).toEqual({
            mode: 'matrix',
            standardTab: 'chat',
            matrixGrid: { cols: 3, rows: 3 },
            matrixTasksVisible: true,
            updatedAt: 123,
        });
    });

    it('merges updated team workspace preferences into local settings', () => {
        const updated = applyLocalSettings(localSettingsDefaults, {
            teamWorkspacePreferences: {
                'team-2': {
                    mode: 'standard',
                    standardTab: 'board',
                    updatedAt: 456,
                },
            },
        });

        expect(updated.teamWorkspacePreferences['team-2']).toMatchObject({
            mode: 'standard',
            standardTab: 'board',
            updatedAt: 456,
        });
    });
});
