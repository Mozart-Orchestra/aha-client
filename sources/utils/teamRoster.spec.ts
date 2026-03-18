import { describe, expect, it } from 'vitest';

import {
    compareTeamRosterEntries,
    getTeamMemberMapFromArtifact,
    getTeamSessionIdsFromArtifact,
    parseTeamMembersFromArtifact,
} from './teamRoster';

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

describe('compareTeamRosterEntries', () => {
    it('keeps role priority ahead of runtime message churn', () => {
        const master = {
            member: {
                sessionId: 'session-master',
                roleId: 'master',
            },
            session: {
                createdAt: 200,
                active: true,
                metadata: { role: 'master' },
            } as any,
            fallbackIndex: 1,
        };

        const implementer = {
            member: {
                sessionId: 'session-impl',
                roleId: 'implementer',
            },
            session: {
                createdAt: 100,
                active: true,
                metadata: { role: 'implementer' },
            } as any,
            fallbackIndex: 0,
        };

        expect(compareTeamRosterEntries(master, implementer)).toBeLessThan(0);
    });

    it('uses lifecycle spawn time instead of volatile array order', () => {
        const earlier = {
            member: {
                memberId: 'member-a',
                sessionId: 'session-a',
                roleId: 'implementer',
                lifecycle: {
                    spawnRequestedAt: 10,
                },
            },
            session: {
                createdAt: 200,
                active: true,
                metadata: { role: 'implementer' },
            } as any,
            fallbackIndex: 5,
        };

        const later = {
            member: {
                memberId: 'member-b',
                sessionId: 'session-b',
                roleId: 'implementer',
                lifecycle: {
                    spawnRequestedAt: 20,
                },
            },
            session: {
                createdAt: 100,
                active: true,
                metadata: { role: 'implementer' },
            } as any,
            fallbackIndex: 0,
        };

        expect(compareTeamRosterEntries(earlier, later)).toBeLessThan(0);
    });

    it('keeps stable ordering regardless of active flag changes', () => {
        const active = {
            member: {
                sessionId: 'same-session',
                roleId: 'implementer',
            },
            session: {
                createdAt: 100,
                active: true,
                metadata: { role: 'implementer' },
            } as any,
            fallbackIndex: 1,
        };

        const inactive = {
            member: {
                sessionId: 'same-session',
                roleId: 'implementer',
            },
            session: {
                createdAt: 100,
                active: false,
                metadata: { role: 'implementer' },
            } as any,
            fallbackIndex: 0,
        };

        expect(compareTeamRosterEntries(active, inactive)).toBeGreaterThan(0);
    });
});
