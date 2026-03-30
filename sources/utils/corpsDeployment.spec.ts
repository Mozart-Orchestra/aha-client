import { describe, expect, it } from 'vitest';

import type { LegionImage } from './genomeHub';
import {
    buildCorpsSeedBoard,
    expandCorpsMemberPlans,
    getDefaultCorpsTeamName,
    parseCorpsGenomeRef,
    resolveCorpsRoleId,
} from './corpsDeployment';

const sampleCorps: LegionImage = {
    namespace: '@official',
    name: 'fullstack-squad',
    version: 1,
    description: 'Full-stack development team',
    members: [
        {
            genome: '@official/master',
            roleAlias: 'master',
            count: 1,
            required: true,
            overlay: {
                authorities: ['user.reply', 'task.create', 'task.assign'],
                promptSuffix: 'You are the only public entrypoint.',
            },
        },
        { genome: '@official/implementer', count: 2, required: true },
        { genome: '@official/qa-engineer', required: false },
    ],
    bootContext: {
        teamDescription: 'Delivery Squad',
        initialObjective: 'Ship the sprint backlog',
        sharedContext: ['Chat is not a task system.'],
        commandChain: ['user', 'master', 'builder'],
        taskPolicy: {
            boardIsSourceOfTruth: true,
            requireTaskForExecution: true,
        },
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

    it('resolves corps member roles from legacy role fields when genome refs are missing', () => {
        expect(resolveCorpsRoleId({
            role: 'content-strategist',
            displayName: '内容策划师',
            genomeRef: '内容策划师 (Content Strategist)',
        })).toBe('content-strategist');
    });

    it('expands corps members into concrete deployment plans', () => {
        expect(expandCorpsMemberPlans(sampleCorps)).toEqual([
            expect.objectContaining({ roleId: 'master', ordinal: 1, displayName: 'Master' }),
            expect.objectContaining({ roleId: 'implementer', ordinal: 1, displayName: 'Implementer 1' }),
            expect.objectContaining({ roleId: 'implementer', ordinal: 2, displayName: 'Implementer 2' }),
            expect.objectContaining({ roleId: 'qa-engineer', ordinal: 1, displayName: 'Qa Engineer' }),
        ]);
        expect(expandCorpsMemberPlans(sampleCorps)[0].authorities).toEqual(['user.reply', 'task.create', 'task.assign']);
    });

    it('expands legacy corps members with display names and non-canonical refs', () => {
        expect(expandCorpsMemberPlans({
            ...sampleCorps,
            members: [
                {
                    role: 'master',
                    displayName: '军团指挥官',
                },
                {
                    role: 'content-strategist',
                    displayName: '内容策划师',
                    genomeRef: '内容策划师 (Content Strategist)',
                    count: 2,
                },
            ],
        })).toEqual([
            expect.objectContaining({
                genomeRef: '',
                namespace: null,
                genomeName: null,
                roleId: 'master',
                ordinal: 1,
                displayName: '军团指挥官',
            }),
            expect.objectContaining({
                genomeRef: '内容策划师 (Content Strategist)',
                namespace: null,
                genomeName: null,
                roleId: 'content-strategist',
                ordinal: 1,
                displayName: '内容策划师 1',
            }),
            expect.objectContaining({
                genomeRef: '内容策划师 (Content Strategist)',
                namespace: null,
                genomeName: null,
                roleId: 'content-strategist',
                ordinal: 2,
                displayName: '内容策划师 2',
            }),
        ]);
    });

    it('prefers boot context name when deriving default team names', () => {
        expect(getDefaultCorpsTeamName('Fallback Name', sampleCorps)).toBe('Delivery Squad');
    });

    it('uses the first non-empty line when boot context stores a multi-line team prompt', () => {
        expect(getDefaultCorpsTeamName('Fallback Name', {
            ...sampleCorps,
            bootContext: {
                teamDescription: 'Edict Full Court\n- taizi is the only user entrypoint',
                initialObjective: 'Ship the sprint backlog',
            },
        })).toBe('Edict Full Court');
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
        expect(board.team?.bootContext?.teamDescription).toBe('Delivery Squad');
        expect(board.team?.bootContext?.initialObjective).toBe('Ship the sprint backlog');
        expect(board.team?.bootContext?.sharedContext).toEqual(['Chat is not a task system.']);
        expect(board.team?.bootContext?.commandChain).toEqual(['user', 'master', 'builder']);
        expect(board.team?.bootContext?.taskPolicy).toEqual({
            boardIsSourceOfTruth: true,
            requireTaskForExecution: true,
        });
        expect(board.tasks).toEqual([
            expect.objectContaining({
                id: 'team-goal',
                title: 'Team Goal: Ship the sprint backlog',
                status: 'todo',
            }),
        ]);
    });
});
