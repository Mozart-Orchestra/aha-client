const KANBAN_STATUS_ALIASES: Record<string, string> = {
    'in_progress': 'in-progress',
    'inprogress': 'in-progress',
    'InProgress': 'in-progress',
    'IN_PROGRESS': 'in-progress',
};

export function normalizeKanbanStatus(status?: string | null): string {
    if (!status) {
        return '';
    }

    return KANBAN_STATUS_ALIASES[status] ?? status.toLowerCase();
}

export function resolveTaskDropStatus(args: {
    currentStatus?: string | null;
    targetColumnId?: string | null;
}): string | null {
    const currentStatus = normalizeKanbanStatus(args.currentStatus);
    const targetStatus = normalizeKanbanStatus(args.targetColumnId);

    if (!targetStatus || currentStatus === targetStatus) {
        return null;
    }

    return targetStatus;
}
