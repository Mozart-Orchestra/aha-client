import { describe, expect, it } from 'vitest';

import { buildMentionChipAccessibilityLabel, buildMentionChipLabel } from './teamMentionSummary';

describe('teamMentionSummary', () => {
    it('returns null when there are no mentioned agents', () => {
        expect(buildMentionChipLabel([])).toBeNull();
        expect(buildMentionChipAccessibilityLabel([])).toBeNull();
    });

    it('builds a single-agent chip label from display name', () => {
        expect(buildMentionChipLabel([
            { displayName: 'Codex-3', roleLabel: 'Implementer' }
        ])).toBe('@Codex-3');

        expect(buildMentionChipAccessibilityLabel([
            { displayName: 'Codex-3', roleLabel: 'Implementer' }
        ])).toBe('Mentioned Codex-3');
    });

    it('falls back to role label when display name is missing', () => {
        expect(buildMentionChipLabel([
            { roleLabel: 'Reviewer' }
        ])).toBe('@Reviewer');
    });

    it('summarizes additional mentioned agents as a +N suffix', () => {
        expect(buildMentionChipLabel([
            { displayName: 'Codex-3' },
            { displayName: 'Reviewer' },
            { displayName: 'Org Manager' }
        ])).toBe('@Codex-3 +2');

        expect(buildMentionChipAccessibilityLabel([
            { displayName: 'Codex-3' },
            { displayName: 'Reviewer' },
            { displayName: 'Org Manager' }
        ])).toBe('Mentioned Codex-3 and 2 more');
    });
});
