import type { KanbanBoard, KanbanColumn } from '@/sync/kanbanTypes';

export function ensureKanbanColumns(data: Partial<KanbanBoard> | null | undefined, defaultColumns: KanbanColumn[]): KanbanBoard {
    const baseColumns = Array.isArray(data?.columns) && data.columns.length > 0
        ? data.columns
        : defaultColumns;

    const mergedColumns = [...baseColumns];
    defaultColumns.forEach((column) => {
        if (!mergedColumns.some((candidate) => candidate.id === column.id)) {
            mergedColumns.push(column);
        }
    });

    return {
        ...(data as KanbanBoard),
        tasks: Array.isArray(data?.tasks) ? data.tasks : [],
        columns: mergedColumns,
    };
}

export function resolveStickyKanbanBoard(params: {
    desktopBridge: boolean;
    desktopBoard: KanbanBoard | null;
    artifactBody?: string | null;
    parsedBoard: KanbanBoard | null;
    parseError?: Error | null;
    lastKnownBoard: KanbanBoard | null;
    defaultBoard: KanbanBoard;
}): KanbanBoard {
    const {
        desktopBridge,
        desktopBoard,
        artifactBody,
        parsedBoard,
        parseError,
        lastKnownBoard,
        defaultBoard,
    } = params;

    if (desktopBridge) {
        return ensureKanbanColumns(desktopBoard || lastKnownBoard || defaultBoard, defaultBoard.columns);
    }

    if (!artifactBody || parseError || !parsedBoard) {
        return ensureKanbanColumns(lastKnownBoard || defaultBoard, defaultBoard.columns);
    }

    return ensureKanbanColumns(parsedBoard, defaultBoard.columns);
}
