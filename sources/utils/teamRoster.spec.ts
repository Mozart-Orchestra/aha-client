import { describe, expect, it } from 'vitest';

import { getTeamMemberMapFromArtifact, getTeamSessionIdsFromArtifact, parseTeamMembersFromArtifact } from './teamRoster';

describe('teamRoster helpers', () => {
    it('parses members from team artifact body', () => {
        const artifact = {
            sessions: ['session-1'],
            body: JSON.stringify({
                team: {
                    members: [
                        { sessionId: 'session-1', roleId: 'architect' },
                        { sessionId: 'session-2', roleId: 'implementer', runtimeType: 'codex' },
                    ],
                },
            }),
        };

        const members = parseTeamMembersFromArtifact(artifact);
        expect(members).toHaveLength(2);
        expect(members[1]?.sessionId).toBe('session-2');
        expect(members[1]?.runtimeType).toBe('codex');
    });

    it('merges header sessions with body members', () => {
        const artifact = {
            sessions: ['session-1'],
            body: JSON.stringify({
                team: {
                    members: [
                        { sessionId: 'session-2', roleId: 'implementer' },
                        { sessionId: 'session-1', roleId: 'architect' },
                    ],
                },
            }),
        };

        expect(getTeamSessionIdsFromArtifact(artifact)).toEqual(['session-1', 'session-2']);
    });

    it('builds a member map keyed by session id', () => {
        const artifact = {
            sessions: [],
            body: JSON.stringify({
                team: {
                    members: [
                        { sessionId: 'session-2', roleId: 'implementer', displayName: 'Codex Worker' },
                    ],
                },
            }),
        };

        const map = getTeamMemberMapFromArtifact(artifact);
        expect(map.get('session-2')?.displayName).toBe('Codex Worker');
    });
});
