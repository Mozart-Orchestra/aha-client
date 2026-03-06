import type { KanbanTask } from '@/sync/kanbanTypes';
import { normalizeTaskStatus } from './teamOverview';

export const GANTT_DAY_WIDTH = 28;
export const GANTT_MIN_TIMELINE_DAYS = 7;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface GanttRow {
    task: KanbanTask;
    status: string;
    assigneeLabel: string;
    startAt: number;
    endAt: number;
    offsetDays: number;
    spanDays: number;
}

export interface GanttTimeline {
    totalDays: number;
    ticks: number[];
    rows: GanttRow[];
}

export const GANTT_STATUS_LABELS: Record<string, string> = {
    todo: 'Todo',
    'in-progress': 'In Progress',
    review: 'Review',
    blocked: 'Blocked',
    done: 'Done',
};

export function startOfUtcDay(timestamp: number): number {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
}

export function formatMonthDay(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

export function getGanttTickStep(totalDays: number): number {
    if (totalDays > 90) return 14;
    if (totalDays > 45) return 7;
    if (totalDays > 21) return 2;
    return 1;
}

export function getGanttTimelineWidth(totalDays: number): number {
    return Math.max(360, totalDays * GANTT_DAY_WIDTH);
}

export function buildGanttTimeline(
    tasks: KanbanTask[],
    assigneeLabelById: Map<string, string> = new Map()
): GanttTimeline | null {
    if (tasks.length === 0) {
        return null;
    }

    const rows: GanttRow[] = tasks
        .map((task) => {
            const status = normalizeTaskStatus(task.status);
            const startSource = task.createdAt || task.updatedAt || Date.now();
            const endSource = task.dueDate ?? task.updatedAt ?? task.createdAt ?? Date.now();
            const startAt = startOfUtcDay(startSource);
            const endAt = Math.max(startAt + ONE_DAY_MS, startOfUtcDay(endSource) + ONE_DAY_MS);
            const assigneeLabel = task.assigneeId
                ? assigneeLabelById.get(task.assigneeId) || task.assigneeId
                : 'Unassigned';

            return {
                task,
                status,
                assigneeLabel,
                startAt,
                endAt,
                offsetDays: 0,
                spanDays: 1,
            };
        })
        .sort((a, b) => {
            if (a.startAt !== b.startAt) {
                return a.startAt - b.startAt;
            }
            if (a.endAt !== b.endAt) {
                return a.endAt - b.endAt;
            }
            return b.task.updatedAt - a.task.updatedAt;
        });

    const rangeStart = Math.min(...rows.map((row) => row.startAt));
    const rangeEnd = Math.max(...rows.map((row) => row.endAt));
    const totalDays = Math.max(
        GANTT_MIN_TIMELINE_DAYS,
        Math.ceil((rangeEnd - rangeStart) / ONE_DAY_MS)
    );

    const normalizedRows = rows.map((row) => {
        const offsetDays = Math.max(0, Math.floor((row.startAt - rangeStart) / ONE_DAY_MS));
        const spanDays = Math.max(1, Math.ceil((row.endAt - row.startAt) / ONE_DAY_MS));
        return { ...row, offsetDays, spanDays };
    });

    const ticks = Array.from({ length: totalDays + 1 }, (_, index) => rangeStart + index * ONE_DAY_MS);

    return {
        totalDays,
        ticks,
        rows: normalizedRows,
    };
}
