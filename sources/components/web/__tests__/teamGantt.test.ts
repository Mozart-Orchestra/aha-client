import { describe, expect, it } from 'vitest';
import {
    buildGanttTimeline,
    formatMonthDay,
    getGanttTickStep,
    getGanttTimelineWidth,
    startOfUtcDay,
} from '../teamGantt';

describe('teamGantt utilities', () => {
    it('builds a gantt timeline from task schedule fields', () => {
        const timeline = buildGanttTimeline([
            {
                id: 'task-1',
                title: 'Wire task actions',
                status: 'in-progress',
                assigneeId: 'sess-1',
                createdAt: Date.UTC(2026, 2, 1),
                updatedAt: Date.UTC(2026, 2, 2),
                dueDate: Date.UTC(2026, 2, 4),
            },
            {
                id: 'task-2',
                title: 'Backfill schedule contract',
                status: 'review',
                createdAt: Date.UTC(2026, 2, 3),
                updatedAt: Date.UTC(2026, 2, 3),
            },
        ], new Map([['sess-1', 'Builder']]))!;

        expect(timeline).not.toBeNull();
        expect(timeline.rows).toHaveLength(2);
        expect(timeline.rows[0].task.id).toBe('task-1');
        expect(timeline.rows[0].assigneeLabel).toBe('Builder');
        expect(timeline.rows[0].spanDays).toBeGreaterThanOrEqual(3);
        expect(timeline.rows[1].spanDays).toBe(1);
        expect(timeline.totalDays).toBeGreaterThanOrEqual(7);
    });

    it('formats tick helpers predictably', () => {
        const timestamp = Date.UTC(2026, 2, 7, 16, 30);
        expect(startOfUtcDay(timestamp)).toBe(Date.UTC(2026, 2, 7));
        expect(formatMonthDay(timestamp)).toBe('3/7');
        expect(getGanttTickStep(10)).toBe(1);
        expect(getGanttTickStep(30)).toBe(2);
        expect(getGanttTimelineWidth(7)).toBe(360);
        expect(getGanttTimelineWidth(20)).toBe(560);
    });
});
