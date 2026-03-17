import type { KanbanTask } from '@/sync/kanbanTypes';

function normalizeTaskStatus(status?: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'in_progress' || normalized === 'inprogress') {
        return 'in-progress';
    }
    return normalized;
}

export function countSignals(tasks: KanbanTask[]) {
    let running = 0;
    let deciding = 0;
    let blocked = 0;

    for (const task of tasks) {
        if (task.isDeleted) continue;

        if (
            task.executionLinks?.some((link) => link.status === 'active')
            || normalizeTaskStatus(task.status) === 'in-progress'
        ) {
            running++;
        }

        if (task.approvalStatus === 'pending') {
            deciding++;
        }

        const unresolvedBlockers = task.blockers?.filter((blocker) => !blocker.resolvedAt) ?? [];
        if (unresolvedBlockers.length > 0) {
            blocked++;
        }
    }

    return { running, deciding, blocked };
}

export function selectSignalsForDisplay<T extends { count: number }>(signals: T[]): {
    signals: T[];
    hasActivity: boolean;
} {
    const activeSignals = signals.filter((signal) => signal.count > 0);
    if (activeSignals.length > 0) {
        return {
            signals: activeSignals,
            hasActivity: true,
        };
    }

    return {
        signals,
        hasActivity: false,
    };
}
