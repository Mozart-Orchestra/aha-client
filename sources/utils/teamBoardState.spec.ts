import { describe, expect, it } from 'vitest';

import type { KanbanBoard } from '@/sync/kanbanTypes';
import { DEFAULT_KANBAN_BOARD } from '@/sync/kanbanTypes';
import { ensureKanbanColumns, resolveStickyKanbanBoard } from './teamBoardState';

describe('teamBoardState', () => {
    it('returns the last known board when artifact body is transiently unavailable', () => {
        const lastKnownBoard: KanbanBoard = {
            ...DEFAULT_KANBAN_BOARD,
            tasks: [
                {
                    id: 'task-1',
                    title: 'Keep me',
                    status: 'todo',
                    createdAt: 1,
                    updatedAt: 1,
                } as any,
            ],
        };

        const board = resolveStickyKanbanBoard({
            desktopBridge: false,
            desktopBoard: null,
            artifactBody: undefined,
            parsedBoard: null,
            parseError: null,
            lastKnownBoard,
            defaultBoard: DEFAULT_KANBAN_BOARD,
        });

        expect(board.tasks).toHaveLength(1);
        expect(board.tasks[0]?.id).toBe('task-1');
    });

    it('prefers the parsed board when valid artifact data exists', () => {
        const parsedBoard: KanbanBoard = {
            ...DEFAULT_KANBAN_BOARD,
            tasks: [
                {
                    id: 'task-2',
                    title: 'Fresh board',
                    status: 'review',
                    createdAt: 2,
                    updatedAt: 2,
                } as any,
            ],
        };

        const board = resolveStickyKanbanBoard({
            desktopBridge: false,
            desktopBoard: null,
            artifactBody: '{}',
            parsedBoard,
            parseError: null,
            lastKnownBoard: null,
            defaultBoard: DEFAULT_KANBAN_BOARD,
        });

        expect(board.tasks[0]?.id).toBe('task-2');
    });

    it('ensures default columns remain present even when board data is partial', () => {
        const board = ensureKanbanColumns({ tasks: [] }, DEFAULT_KANBAN_BOARD.columns);

        expect(board.columns.map((column) => column.id)).toEqual(
            DEFAULT_KANBAN_BOARD.columns.map((column) => column.id),
        );
    });
});
