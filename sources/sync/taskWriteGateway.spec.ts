import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DecryptedArtifact } from './artifactTypes';
import type { KanbanBoard, KanbanTask } from './kanbanTypes';

const mockStorage = vi.hoisted(() => {
    const state = {
        artifacts: {} as Record<string, DecryptedArtifact>,
        updateArtifact: vi.fn((artifact: DecryptedArtifact) => {
            state.artifacts[artifact.id] = artifact;
        }),
    };
    return state;
});

vi.mock('@/sync/storage', () => ({
    storage: {
        getState: () => ({
            artifacts: mockStorage.artifacts,
            updateArtifact: mockStorage.updateArtifact,
        }),
    },
}));

import { createTaskServerFirstWithFallback } from './taskWriteGateway';

const teamId = 'team-1';

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
    return {
        id: 'task-1',
        title: 'Task 1',
        status: 'todo',
        createdAt: 1_000,
        updatedAt: 1_000,
        ...overrides,
    };
}

function seedBoard(tasks: KanbanTask[]) {
    const board: KanbanBoard = {
        name: 'Team',
        columns: [{ id: 'todo', title: 'To Do' }],
        tasks,
    };

    mockStorage.artifacts[teamId] = {
        id: teamId,
        title: 'Team',
        type: 'team',
        body: JSON.stringify(board, null, 2),
        headerVersion: 1,
        bodyVersion: 1,
        seq: 1,
        createdAt: 1_000,
        updatedAt: 1_000,
        isDecrypted: true,
    };
}

describe('createTaskServerFirstWithFallback', () => {
    beforeEach(() => {
        mockStorage.artifacts = {};
        mockStorage.updateArtifact.mockClear();
    });

    it('patches the returned server task locally without waiting for a full artifact refresh', async () => {
        seedBoard([]);
        const createdTask = makeTask({ title: 'Server task' });
        const refreshTeamArtifact = vi.fn();

        const result = await createTaskServerFirstWithFallback({
            teamId,
            createTaskOnServer: vi.fn().mockResolvedValue(createdTask),
            legacyCreateTask: vi.fn(),
            refreshTeamArtifact,
        }, { title: 'Server task' });

        expect(result).toMatchObject({
            task: createdTask,
            writePath: 'server',
            localPatchApplied: true,
        });
        expect(refreshTeamArtifact).not.toHaveBeenCalled();
        expect(mockStorage.updateArtifact).toHaveBeenCalledTimes(1);

        const patchedBoard = JSON.parse(mockStorage.artifacts[teamId]!.body!) as KanbanBoard;
        expect(patchedBoard.tasks).toEqual([createdTask]);
    });

    it('falls back to a full artifact refresh when no local board is loaded', async () => {
        const createdTask = makeTask({ title: 'Recovered task' });
        const refreshTeamArtifact = vi.fn(async () => {
            seedBoard([createdTask]);
        });

        const result = await createTaskServerFirstWithFallback({
            teamId,
            createTaskOnServer: vi.fn().mockResolvedValue(createdTask),
            legacyCreateTask: vi.fn(),
            refreshTeamArtifact,
        }, { title: 'Recovered task' });

        expect(refreshTeamArtifact).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            task: createdTask,
            writePath: 'server',
        });
    });
});
