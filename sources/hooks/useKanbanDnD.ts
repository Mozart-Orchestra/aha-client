/**
 * useKanbanDnD - Custom hook managing all kanban drag-and-drop state.
 *
 * Tracks the currently dragged task, its source column, and the column
 * the user is hovering over (drop target). Exposes handler factories used
 * by DraggableTaskCard and KanbanBoard to coordinate cross-column moves.
 *
 * Optimistic update strategy:
 *   1. Update local state immediately (instant UI feedback).
 *   2. Persist to server via sync.updateArtifact.
 *   3. On failure, roll back to previous positions.
 */
import * as React from 'react';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { sync } from '@/sync/sync';
import { useAuth } from '@/auth/AuthContext';
import type { KanbanTask, KanbanBoard } from '@/sync/kanbanTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnId = string;

export interface DragState {
    taskId: string;
    fromColumnId: ColumnId;
}

export interface KanbanDnDHandlers {
    /** Called when the user starts dragging a card. */
    onDragStart: (taskId: string, fromColumnId: ColumnId) => void;
    /** Called continuously while dragging to update hover target. */
    onDragMove: (targetColumnId: ColumnId | null) => void;
    /** Called when the drag gesture ends. */
    onDragEnd: () => void;
    /** Called when a swipe gesture resolves to a status change. */
    onSwipeMove: (taskId: string, fromColumnId: ColumnId, direction: 'forward' | 'backward') => void;
}

export interface KanbanDnDState {
    /** Currently dragged task, or null when idle. */
    dragging: DragState | null;
    /** Column the card is currently hovering over. */
    dropTargetColumnId: ColumnId | null;
    /** Inline task positions — keyed by taskId, value is the column id. */
    columnByTask: Record<string, ColumnId>;
}

export interface UseKanbanDnDResult {
    state: KanbanDnDState;
    handlers: KanbanDnDHandlers;
    /** Reanimated shared value for the active drag x-position (screen coords). */
    dragX: ReturnType<typeof useSharedValue<number>>;
    /** Reanimated shared value for the active drag y-position (screen coords). */
    dragY: ReturnType<typeof useSharedValue<number>>;
}

// ---------------------------------------------------------------------------
// Column ordering helpers
// ---------------------------------------------------------------------------

const COLUMN_ORDER = ['todo', 'in-progress', 'review', 'done'] as const;
type KnownColumnId = typeof COLUMN_ORDER[number];

function getAdjacentColumn(
    currentColumnId: ColumnId,
    direction: 'forward' | 'backward',
    allColumnIds: ColumnId[],
): ColumnId | null {
    // Prefer canonical ordering when the column id is known.
    const knownIdx = COLUMN_ORDER.indexOf(currentColumnId as KnownColumnId);
    if (knownIdx !== -1) {
        const nextIdx = direction === 'forward' ? knownIdx + 1 : knownIdx - 1;
        const nextId = COLUMN_ORDER[nextIdx];
        return nextId ?? null;
    }

    // Fallback: use the board's actual column order.
    const idx = allColumnIds.indexOf(currentColumnId);
    if (idx === -1) return null;
    const nextIdx = direction === 'forward' ? idx + 1 : idx - 1;
    return allColumnIds[nextIdx] ?? null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useKanbanDnD(
    board: KanbanBoard,
    teamArtifactId: string,
    teamArtifactTitle: string,
    teamArtifactSessions: string[],
): UseKanbanDnDResult {
    const auth = useAuth();

    // Derive initial column mapping from board tasks.
    const initialColumnByTask = React.useMemo<Record<string, ColumnId>>(() => {
        const result: Record<string, ColumnId> = {};
        for (const task of board.tasks) {
            if (!task.isDeleted) {
                result[task.id] = task.status;
            }
        }
        return result;
    }, [board.tasks]);

    const [state, setState] = React.useState<KanbanDnDState>(() => ({
        dragging: null,
        dropTargetColumnId: null,
        columnByTask: initialColumnByTask,
    }));

    // Keep columnByTask in sync when board changes externally (e.g. server push).
    React.useEffect(() => {
        setState(prev => ({
            ...prev,
            columnByTask: initialColumnByTask,
        }));
    }, [initialColumnByTask]);

    // Reanimated shared values for smooth gesture tracking on the UI thread.
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);

    // Derived list of all column ids in board order.
    const allColumnIds = React.useMemo(
        () => board.columns.map(c => c.id),
        [board.columns],
    );

    // -----------------------------------------------------------------------
    // Persist task status change to server
    // -----------------------------------------------------------------------

    const persistMove = React.useCallback(
        async (
            taskId: string,
            targetColumnId: ColumnId,
            previousColumnByTask: Record<string, ColumnId>,
        ) => {
            if (!auth?.credentials) return;

            try {
                // Build updated board body with the new task status.
                const updatedTasks: KanbanTask[] = board.tasks.map(task => {
                    if (task.id !== taskId) return task;
                    return { ...task, status: targetColumnId, updatedAt: Date.now() };
                });

                const updatedBoard: KanbanBoard = { ...board, tasks: updatedTasks };

                await sync.updateArtifact(
                    teamArtifactId,
                    teamArtifactTitle,
                    JSON.stringify(updatedBoard, null, 2),
                    teamArtifactSessions,
                    false,
                    'team',
                );

                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                // Roll back optimistic update on failure.
                setState(prev => ({
                    ...prev,
                    columnByTask: previousColumnByTask,
                }));
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        },
        [auth?.credentials, board, teamArtifactId, teamArtifactTitle, teamArtifactSessions],
    );

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    const onDragStart = React.useCallback((taskId: string, fromColumnId: ColumnId) => {
        setState(prev => ({
            ...prev,
            dragging: { taskId, fromColumnId },
            dropTargetColumnId: fromColumnId,
        }));
    }, []);

    const onDragMove = React.useCallback((targetColumnId: ColumnId | null) => {
        setState(prev => ({
            ...prev,
            dropTargetColumnId: targetColumnId,
        }));
    }, []);

    const onDragEnd = React.useCallback(() => {
        setState(prev => {
            const { dragging, dropTargetColumnId, columnByTask } = prev;

            if (!dragging || !dropTargetColumnId) {
                return { ...prev, dragging: null, dropTargetColumnId: null };
            }

            const { taskId, fromColumnId } = dragging;

            if (fromColumnId === dropTargetColumnId) {
                return { ...prev, dragging: null, dropTargetColumnId: null };
            }

            // Optimistic update.
            const nextColumnByTask = { ...columnByTask, [taskId]: dropTargetColumnId };

            // Async persist (fire-and-forget with rollback on error).
            persistMove(taskId, dropTargetColumnId, columnByTask);

            return {
                dragging: null,
                dropTargetColumnId: null,
                columnByTask: nextColumnByTask,
            };
        });
    }, [persistMove]);

    const onSwipeMove = React.useCallback(
        (taskId: string, fromColumnId: ColumnId, direction: 'forward' | 'backward') => {
            const targetColumnId = getAdjacentColumn(fromColumnId, direction, allColumnIds);
            if (!targetColumnId) return;

            setState(prev => {
                const previousColumnByTask = prev.columnByTask;
                const nextColumnByTask = { ...previousColumnByTask, [taskId]: targetColumnId };
                persistMove(taskId, targetColumnId, previousColumnByTask);
                return { ...prev, columnByTask: nextColumnByTask };
            });
        },
        [allColumnIds, persistMove],
    );

    const handlers: KanbanDnDHandlers = React.useMemo(
        () => ({ onDragStart, onDragMove, onDragEnd, onSwipeMove }),
        [onDragStart, onDragMove, onDragEnd, onSwipeMove],
    );

    return { state, handlers, dragX, dragY };
}
