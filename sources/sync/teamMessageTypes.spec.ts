import { describe, expect, it } from 'vitest';

import { canonicalizeTeamMentions, extractMentionTokens } from './teamMessageTypes';

describe('teamMessageTypes mention canonicalization', () => {
    const candidates = [
        {
            sessionId: 'cmmta0s4abcde1234567890',
            displayName: 'Frontend Implementer',
            roleId: 'implementer',
            aliases: ['frontend-implementer'],
        },
        {
            sessionId: 'cmmta0sqvwxyz1234567890',
            displayName: 'Backend Implementer',
            roleId: 'implementer',
            aliases: ['backend-implementer'],
        },
        {
            sessionId: 'cmmtamcmr0mpnju5bymvlzdgg',
            displayName: 'Reviewer',
            roleId: 'reviewer',
        },
        {
            sessionId: 'cmmsnd9go006vju5b9c8mnwbe',
            displayName: 'Org Manager',
            roleId: 'org-manager',
        },
    ];

    it('extracts mention tokens from text', () => {
        expect(extractMentionTokens('@reviewer please pair with @cmmta0sq')).toEqual([
            'reviewer',
            'cmmta0sq',
        ]);
    });

    it('preserves canonical full session ids', () => {
        expect(canonicalizeTeamMentions(['cmmtamcmr0mpnju5bymvlzdgg'], candidates)).toEqual([
            'cmmtamcmr0mpnju5bymvlzdgg',
        ]);
    });

    it('resolves a unique short session id prefix to the full session id', () => {
        expect(canonicalizeTeamMentions(['cmmta0sq'], candidates)).toEqual([
            'cmmta0sqvwxyz1234567890',
        ]);
    });

    it('resolves hyphenated display names and unique role ids', () => {
        expect(canonicalizeTeamMentions(['frontend-implementer', 'reviewer', 'org-manager'], candidates)).toEqual([
            'cmmta0s4abcde1234567890',
            'cmmtamcmr0mpnju5bymvlzdgg',
            'cmmsnd9go006vju5b9c8mnwbe',
        ]);
    });

    it('rejects ambiguous short-form aliases instead of storing them', () => {
        expect(canonicalizeTeamMentions(['implementer'], candidates)).toEqual([]);
    });

    it('drops malformed short mentions that cannot be resolved', () => {
        expect(canonicalizeTeamMentions(['cmmt'], candidates)).toEqual([]);
    });
});
