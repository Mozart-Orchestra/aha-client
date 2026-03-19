import { describe, expect, it } from 'vitest';

import type { CorpsSpec } from './genomeHub';
import {
    buildCorpsSeedBoard,
    expandCorpsMemberPlans,
    getDefaultCorpsTeamName,
    parseCorpsGenomeRef,
    resolveCorpsRoleId,
} from './corpsDeployment';

const sampleCorps: CorpsSpec = {
    namespace: '@official',
    name: 'fullstack-squad',
    version: 1,
    description: 'Full-stack development team',
    members: [
        { genome: '@official/master', roleAlias: 'master', count: 1, required: true },
        { genome: '@official/implementer', count: 2, required: true },
        { genome: '@official/qa-engineer', required: false },
    ],
    bootContext: {
        teamDescription: 'Delivery Squad',
        initialObjective: 'Ship the sprint backlog',
    },
};

describe('corpsDeployment', () => {
    it('parses corps genome refs', () => {
        expect(parseCorpsGenomeRef('@official/master')).toEqual({
            namespace: '@official',
            name: 'master',
        });
        expect(parseCorpsGenomeRef('master')).toBeNull();
    });

    it('resolves corps member roles from alias or genome ref', () => {
        expect(resolveCorpsRoleId(sampleCorps.members[0])).toBe('master');
        expect(resolveCorpsRoleId(sampleCorps.members[1])).toBe('implementer');
    });

    it('expands corps members into concrete deployment plans', () => {
        expect(expandCorpsMemberPlans(sampleCorps)).toEqual([
            expect.objectContaining({ roleId: 'master', ordinal: 1, displayName: 'Master' }),
            expect.objectContaining({ roleId: 'implementer', ordinal: 1, displayName: 'Implementer 1' }),
            expect.objectContaining({ roleId: 'implementer', ordinal: 2, displayName: 'Implementer 2' }),
            expect.objectContaining({ roleId: 'qa-engineer', ordinal: 1, displayName: 'Qa Engineer' }),
        ]);
    });

    it('prefers boot context name when deriving default team names', () => {
        expect(getDefaultCorpsTeamName('Fallback Name', sampleCorps)).toBe('Delivery Squad');
    });

    it('builds a team board with seeded members and objective task', () => {
        const board = buildCorpsSeedBoard({
            name: 'Delivery Squad',
            corps: sampleCorps,
            members: [
                {
                    memberId: 'member-1',
                    sessionId: 'session-1',
                    sessionTag: 'team:1:member:1',
                    roleId: 'master',
                    displayName: 'Master',
                },
            ],
        });

        expect(board.team?.members).toHaveLength(1);
        expect(board.tasks).toEqual([
            expect.objectContaining({
                id: 'team-goal',
                title: 'Team Goal: Ship the sprint backlog',
                status: 'todo',
            }),
        ]);
    });
});
