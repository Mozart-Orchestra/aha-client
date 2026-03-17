import { describe, expect, it } from 'vitest';

import {
    getRecommendedGrid,
    resolveMatrixGridSelection,
    resolveTeamWorkspaceState,
    sortMatrixRoster,
    type MatrixSortableEntry,
    type TeamWorkspacePreference,
} from './teamMatrix';

describe('teamMatrix', () => {
    it('recommends the first preset that can fit the current agent count', () => {
        expect(getRecommendedGrid(1)).toEqual({ cols: 2, rows: 2 });
        expect(getRecommendedGrid(5)).toEqual({ cols: 2, rows: 3 });
        expect(getRecommendedGrid(9)).toEqual({ cols: 3, rows: 3 });
        expect(getRecommendedGrid(13)).toEqual({ cols: 4, rows: 4 });
    });

    it('keeps meta agents first while preserving stable order for non-meta agents', () => {
        const entries: MatrixSortableEntry[] = [
            { index: 0, member: { sessionId: 'builder-1', roleId: 'builder' } },
            { index: 1, member: { sessionId: 'master-1', roleId: 'master' } },
            { index: 2, member: { sessionId: 'researcher-1', roleId: 'researcher' } },
            { index: 3, member: { sessionId: 'org-1', roleId: 'org-manager' } },
            { index: 4, member: { sessionId: 'implementer-1', roleId: 'implementer' } },
            { index: 5, member: { sessionId: 'orchestrator-1', roleId: 'orchestrator' } },
        ];

        expect(sortMatrixRoster(entries).map((entry) => entry.member.sessionId)).toEqual([
            'org-1',
            'master-1',
            'orchestrator-1',
            'builder-1',
            'researcher-1',
            'implementer-1',
        ]);
    });

    it('resolves matrix mode from the explicit route param', () => {
        expect(resolveTeamWorkspaceState({
            modeParam: 'matrix',
            tabParam: 'board',
            preference: null,
        })).toEqual({
            mode: 'matrix',
            standardTab: 'chat',
        });
    });

    it('maps legacy tab=matrix routes into matrix mode', () => {
        expect(resolveTeamWorkspaceState({
            modeParam: undefined,
            tabParam: 'matrix',
            preference: null,
        })).toEqual({
            mode: 'matrix',
            standardTab: 'chat',
        });
    });

    it('uses stored preferences when the route does not override them', () => {
        const preference: TeamWorkspacePreference = {
            mode: 'standard',
            standardTab: 'evolution',
            matrixGrid: { cols: 3, rows: 3 },
            matrixTasksVisible: false,
            updatedAt: 123,
        };

        expect(resolveTeamWorkspaceState({
            modeParam: undefined,
            tabParam: undefined,
            preference,
        })).toEqual({
            mode: 'standard',
            standardTab: 'evolution',
        });
    });

    it('prefers an explicit standard tab over stored preference', () => {
        const preference: TeamWorkspacePreference = {
            mode: 'standard',
            standardTab: 'info',
            updatedAt: 123,
        };

        expect(resolveTeamWorkspaceState({
            modeParam: 'standard',
            tabParam: 'board',
            preference,
        })).toEqual({
            mode: 'standard',
            standardTab: 'board',
        });
    });

    it('keeps a stored matrix grid stable across rapid agent-count updates', () => {
        const preference: TeamWorkspacePreference = {
            mode: 'matrix',
            standardTab: 'chat',
            matrixGrid: { cols: 2, rows: 2 },
            updatedAt: 123,
        };

        expect(resolveMatrixGridSelection({
            preference,
            previousGrid: null,
            agentCount: 4,
        })).toEqual({ cols: 2, rows: 2 });

        expect(resolveMatrixGridSelection({
            preference,
            previousGrid: { cols: 2, rows: 2 },
            agentCount: 7,
        })).toEqual({ cols: 2, rows: 2 });
    });

    it('locks the last selected matrix grid instead of re-recommending on every rapid update', () => {
        const initialGrid = resolveMatrixGridSelection({
            preference: null,
            previousGrid: null,
            agentCount: 4,
        });

        expect(initialGrid).toEqual({ cols: 2, rows: 2 });

        expect(resolveMatrixGridSelection({
            preference: null,
            previousGrid: initialGrid,
            agentCount: 7,
        })).toEqual(initialGrid);
    });
});
