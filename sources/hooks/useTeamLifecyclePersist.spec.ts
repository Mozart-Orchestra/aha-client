import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';

// Hoisted mocks
const mockBuildPersistPlan = vi.hoisted(() => vi.fn());
const mockUpdateArtifact = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/utils/teamLifecycle', () => ({
    buildDerivedLifecyclePersistPlan: mockBuildPersistPlan,
}));

vi.mock('@/sync/sync', () => ({
    sync: {
        updateArtifact: mockUpdateArtifact,
    },
}));

import { useTeamLifecyclePersist } from './useTeamLifecyclePersist';
import type { DecryptedArtifact } from '@/sync/artifactTypes';
import type { KanbanBoard } from '@/sync/kanbanTypes';
import type { TeamMessage } from '@/sync/teamMessageTypes';
import type { Session } from '@/sync/storageTypes';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<Result>(hook: () => Result) {
    const result: { current: Result } = { current: undefined as unknown as Result };
    let renderer: ReturnType<typeof create>;

    function Wrapper() {
        result.current = hook();
        return null;
    }

    act(() => {
        renderer = create(React.createElement(Wrapper));
    });

    return {
        result,
        rerender: (newHook?: () => Result) => {
            act(() => {
                renderer.update(React.createElement(
                    newHook ? function W() { result.current = newHook(); return null; } : Wrapper
                ));
            });
        },
        unmount: () => {
            act(() => {
                renderer.unmount();
            });
        },
    };
}

// Test fixtures
function makeArtifact(overrides?: Partial<DecryptedArtifact>): DecryptedArtifact {
    return {
        id: 'artifact-1',
        title: 'Team Artifact',
        body: '{}',
        sessions: ['s1'],
        draft: false,
        type: 'team',
        headerVersion: 1,
        bodyVersion: 1,
        seq: 1,
        createdAt: 1000,
        updatedAt: 2000,
        isDecrypted: true,
        ...overrides,
    };
}

function makeBoard(memberCount = 1): KanbanBoard {
    const members = Array.from({ length: memberCount }, (_, i) => ({
        sessionId: `session-${i}`,
        role: 'builder',
        joinedAt: 1000 + i,
    }));
    return {
        tasks: [],
        columns: [],
        team: { members } as any,
    } as KanbanBoard;
}

const emptyMessages: TeamMessage[] = [];
const emptySessions: Session[] = [];

describe('useTeamLifecyclePersist', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockBuildPersistPlan.mockReturnValue({
            changed: false,
            nextBoard: null,
            nextBody: null,
            shouldPersist: false,
            reason: 'no-derived-change',
        });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message?: any) => {
            if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
                return;
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        consoleErrorSpy.mockRestore();
    });

    it('does nothing when artifact is null', () => {
        renderHook(() => useTeamLifecyclePersist(null, makeBoard(), emptyMessages, emptySessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).not.toHaveBeenCalled();
        expect(mockUpdateArtifact).not.toHaveBeenCalled();
    });

    it('does nothing when artifact.body is missing', () => {
        const artifact = makeArtifact({ body: undefined });

        renderHook(() => useTeamLifecyclePersist(artifact, makeBoard(), emptyMessages, emptySessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).not.toHaveBeenCalled();
    });

    it('does nothing when board is null', () => {
        renderHook(() => useTeamLifecyclePersist(makeArtifact(), null, emptyMessages, emptySessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).not.toHaveBeenCalled();
    });

    it('does nothing when board has no team members', () => {
        renderHook(() => useTeamLifecyclePersist(makeArtifact(), makeBoard(0), emptyMessages, emptySessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).not.toHaveBeenCalled();
    });

    it('does not call updateArtifact when persist plan says not to persist', () => {
        const board = makeBoard(1);
        mockBuildPersistPlan.mockReturnValue({
            changed: true,
            nextBoard: board,
            nextBody: JSON.stringify(board, null, 2),
            shouldPersist: false,
            reason: 'body-already-current',
        });

        renderHook(() => useTeamLifecyclePersist(makeArtifact(), board, emptyMessages, emptySessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).toHaveBeenCalled();
        expect(mockUpdateArtifact).not.toHaveBeenCalled();
    });

    it('calls updateArtifact after 250ms debounce when persist plan requests it', () => {
        const board = makeBoard(1);
        const nextBody = JSON.stringify({
            ...board,
            team: {
                ...board.team,
                members: [{ sessionId: 'updated', roleId: 'builder', joinedAt: 9999 }],
            },
        }, null, 2);
        mockBuildPersistPlan.mockReturnValue({
            changed: true,
            nextBoard: board,
            nextBody,
            shouldPersist: true,
            reason: 'persist',
        });

        renderHook(() => useTeamLifecyclePersist(makeArtifact(), board, emptyMessages, emptySessions));

        // Should not be called before 250ms
        expect(mockUpdateArtifact).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(249); });
        expect(mockUpdateArtifact).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(1); });
        expect(mockUpdateArtifact).toHaveBeenCalledTimes(1);
        expect(mockUpdateArtifact).toHaveBeenCalledWith(
            'artifact-1',
            'Team Artifact',
            nextBody,
            ['s1'],
            false,
            'team',
        );
    });

    it('cleanup cancels pending timer on unmount', () => {
        const board = makeBoard(1);
        mockBuildPersistPlan.mockReturnValue({
            changed: true,
            nextBoard: board,
            nextBody: JSON.stringify({ ...board, version: 2 }, null, 2),
            shouldPersist: true,
            reason: 'persist',
        });

        const { unmount } = renderHook(() =>
            useTeamLifecyclePersist(makeArtifact(), board, emptyMessages, emptySessions)
        );

        // Unmount before 250ms fires
        unmount();

        act(() => { vi.runAllTimers(); });

        expect(mockUpdateArtifact).not.toHaveBeenCalled();
    });

    it('passes processStartedAt from allSessions to applyDerivedLifecycleTimestamps', () => {
        const board = makeBoard(1);
        mockBuildPersistPlan.mockReturnValue({
            changed: false,
            nextBoard: null,
            nextBody: null,
            shouldPersist: false,
            reason: 'no-derived-change',
        });

        const sessions: Session[] = [
            {
                id: 'session-0',
                seq: 1,
                createdAt: 1000,
                updatedAt: 2000,
                active: true,
                activeAt: 1500,
                metadata: { processStartedAt: 5555 } as any,
                metadataVersion: 1,
                agentState: null,
                agentStateVersion: 1,
                thinking: false,
                thinkingAt: 0,
                presence: 'online',
            },
        ];

        renderHook(() => useTeamLifecyclePersist(makeArtifact(), board, emptyMessages, sessions));

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan).toHaveBeenCalledWith({
            board,
            currentBody: '{}',
            messages: emptyMessages,
            processStartedBySessionId: expect.any(Map),
            lastScheduledBody: null,
        });
        const passedMap: Map<string, number> = mockBuildPersistPlan.mock.calls[0][0].processStartedBySessionId;
        expect(passedMap.get('session-0')).toBe(5555);
    });

    it('allSessions ref change does not re-trigger effect', () => {
        const board = makeBoard(1);
        mockBuildPersistPlan.mockReturnValue({
            changed: false,
            nextBoard: null,
            nextBody: null,
            shouldPersist: false,
            reason: 'no-derived-change',
        });
        const artifact = makeArtifact();

        let sessions = emptySessions;
        const { rerender } = renderHook(() =>
            useTeamLifecyclePersist(artifact, board, emptyMessages, sessions)
        );

        const callCountAfterMount = mockBuildPersistPlan.mock.calls.length;

        // Change allSessions — dep array is [artifact?.id, board, teamMessages] so should NOT re-run
        sessions = [{ id: 'new-session' } as Session];
        rerender();

        act(() => { vi.runAllTimers(); });

        expect(mockBuildPersistPlan.mock.calls.length).toBe(callCountAfterMount);
    });

    it('logs error if updateArtifact rejects', async () => {
        const board = makeBoard(1);
        mockBuildPersistPlan.mockReturnValue({
            changed: true,
            nextBoard: board,
            nextBody: JSON.stringify({ ...board, version: 2 }, null, 2),
            shouldPersist: true,
            reason: 'persist',
        });
        mockUpdateArtifact.mockRejectedValueOnce(new Error('persist failed'));

        renderHook(() => useTeamLifecyclePersist(makeArtifact(), board, emptyMessages, emptySessions));

        await act(async () => {
            vi.advanceTimersByTime(250);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to persist derived team lifecycle timestamps:',
            expect.any(Error),
        );
    });

    it('passes the pending body back into the next persist plan while the write is in flight', async () => {
        const board = makeBoard(1);
        const nextBody = JSON.stringify({ ...board, version: 2 }, null, 2);
        let resolvePersist: (() => void) | null = null;
        mockUpdateArtifact.mockImplementationOnce(() => new Promise<void>((resolve) => {
            resolvePersist = resolve;
        }));
        mockBuildPersistPlan.mockReturnValue({
            changed: true,
            nextBoard: board,
            nextBody,
            shouldPersist: true,
            reason: 'persist',
        });
        let messages = emptyMessages;

        const { rerender } = renderHook(() =>
            useTeamLifecyclePersist(makeArtifact(), board, messages, emptySessions)
        );

        act(() => { vi.advanceTimersByTime(250); });
        expect(mockUpdateArtifact).toHaveBeenCalledTimes(1);

        messages = [{
            id: 'm1',
            teamId: 'team-1',
            fromSessionId: 'session-0',
            content: 'ready',
            type: 'chat',
            timestamp: 100,
        }];

        rerender();

        expect(mockBuildPersistPlan).toHaveBeenLastCalledWith({
            board,
            currentBody: '{}',
            messages,
            processStartedBySessionId: expect.any(Map),
            lastScheduledBody: nextBody,
        });

        await act(async () => {
            resolvePersist?.();
            await Promise.resolve();
        });
    });
});
