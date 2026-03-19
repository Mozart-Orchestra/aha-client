import { describe, expect, it } from 'vitest';

import { buildSidebarAgentRosterEntries, selectSidebarAgentSessions } from './sidebarAgentSessions';

function createSession(overrides: Record<string, any> = {}): any {
    return {
        id: 'session-1',
        seq: 0,
        createdAt: 0,
        updatedAt: 0,
        active: false,
        activeAt: 0,
        presence: 0,
        thinking: false,
        thinkingAt: 0,
        metadata: null,
        metadataVersion: 0,
        agentState: null,
        agentStateVersion: 0,
        ...overrides,
    };
}

describe('selectSidebarAgentSessions', () => {
    it('returns selected team sessions when a team is focused', () => {
        const result = selectSidebarAgentSessions([
            createSession({ id: 'team-a', metadata: { teamId: 'team-1', role: 'master' } }),
            createSession({ id: 'team-b', metadata: { teamId: 'team-2', role: 'implementer' } }),
        ], {
            selectedTeamId: 'team-1',
            teamSessionIds: new Set(['team-a']),
        });

        expect(result.map((session) => session.id)).toEqual(['team-a']);
    });

    it('keeps the full known-agent roster visible when some agents are active', () => {
        const result = selectSidebarAgentSessions([
            createSession({ id: 'idle-team', metadata: { teamId: 'team-1', role: 'master' } }),
            createSession({ id: 'live-agent', active: true, metadata: { role: 'implementer' } }),
            createSession({ id: 'plain-session', active: true, metadata: null }),
        ]);

        expect(result.map((session) => session.id)).toEqual(['idle-team', 'live-agent']);
    });

    it('falls back to known agent sessions instead of returning an empty list when everyone is idle', () => {
        const result = selectSidebarAgentSessions([
            createSession({ id: 'idle-team', metadata: { teamId: 'team-1', role: 'master' } }),
            createSession({ id: 'idle-agent', metadata: { memberId: 'member-1', flavor: 'implementer' } }),
            createSession({ id: 'plain-session', metadata: null }),
        ]);

        expect(result.map((session) => session.id)).toEqual(['idle-team', 'idle-agent']);
    });

    it('shows idle team agents even when a plain live session exists (wait-mode fix)', () => {
        // Regression test: team agents in wait mode should not disappear when the
        // user's own non-agent session is still active.
        const result = selectSidebarAgentSessions([
            createSession({ id: 'idle-master', metadata: { teamId: 'team-1', role: 'master' } }),
            createSession({ id: 'idle-impl', metadata: { teamId: 'team-1', role: 'implementer' } }),
            createSession({ id: 'user-session', active: true, metadata: null }),
        ]);

        expect(result.map((session) => session.id)).toEqual(['idle-master', 'idle-impl']);
    });

    it('returns live sessions when no known agent sessions exist', () => {
        const result = selectSidebarAgentSessions([
            createSession({ id: 'live-plain', active: true, metadata: null }),
            createSession({ id: 'idle-plain', metadata: null }),
        ]);

        expect(result.map((session) => session.id)).toEqual(['live-plain']);
    });
});

describe('buildSidebarAgentRosterEntries', () => {
    it('includes team-roster members even when their session is missing locally', () => {
        const result = buildSidebarAgentRosterEntries([
            createSession({ id: 'impl-session', metadata: { role: 'implementer', teamId: 'team-1' } }),
            createSession({ id: 'user-session', active: true, metadata: null }),
        ], [
            {
                id: 'team-1',
                type: 'team',
                body: JSON.stringify({
                    team: {
                        members: [
                            { sessionId: 'master-session', roleId: 'master', displayName: 'Master Coordinator' },
                            { sessionId: 'impl-session', roleId: 'implementer', displayName: 'Builder' },
                        ],
                    },
                }),
            },
        ] as any);

        expect(result.map((entry) => entry.sessionId)).toEqual([
            'impl-session',
            'master-session',
        ]);
        expect(result.find((entry) => entry.sessionId === 'master-session')).toMatchObject({
            session: null,
            member: {
                roleId: 'master',
                displayName: 'Master Coordinator',
            },
            teamId: 'team-1',
        });
    });

    it('limits placeholders to the selected team when team context is active', () => {
        const result = buildSidebarAgentRosterEntries([
            createSession({ id: 'impl-session', metadata: { role: 'implementer', teamId: 'team-1' } }),
        ], [
            {
                id: 'team-1',
                type: 'team',
                body: JSON.stringify({
                    team: { members: [{ sessionId: 'master-session', roleId: 'master' }] },
                }),
            },
            {
                id: 'team-2',
                type: 'team',
                body: JSON.stringify({
                    team: { members: [{ sessionId: 'other-master', roleId: 'master' }] },
                }),
            },
        ] as any, {
            selectedTeamId: 'team-1',
            teamSessionIds: new Set(['impl-session']),
        });

        expect(result.map((entry) => entry.sessionId)).toEqual([
            'impl-session',
            'master-session',
        ]);
    });
});
