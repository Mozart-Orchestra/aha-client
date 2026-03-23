import { describe, expect, it, beforeEach, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';

// ── Minimal renderHook shim ───────────────────────────────────────────────────
function renderHook<P extends object, R>(
    hook: (p: P) => R,
    options?: { initialProps?: P }
): { result: { current: R }; rerender: (p: P) => void; unmount: () => void } {
    const result: { current: R } = { current: undefined as unknown as R };
    let renderer: ReturnType<typeof create>;

    function W(props: P) { result.current = hook(props); return null; }

    act(() => { renderer = create(React.createElement(W, options?.initialProps ?? ({} as P))); });

    return {
        result,
        rerender: (p: P) => act(() => renderer.update(React.createElement(W, p))),
        unmount: () => act(() => renderer.unmount()),
    };
}

// ── Mock localStorage ─────────────────────────────────────────────────────────
// useTaskImport delegates persistence to taskExportCache which uses localStorage.

const mockStorage = new Map<string, string>();

beforeEach(() => {
    mockStorage.clear();
    Object.defineProperty(global, 'localStorage', {
        value: {
            getItem: (k: string) => mockStorage.get(k) ?? null,
            setItem: (k: string, v: string) => { mockStorage.set(k, v); },
            removeItem: (k: string) => { mockStorage.delete(k); },
            get length() { return mockStorage.size; },
            key: (i: number) => Array.from(mockStorage.keys())[i] ?? null,
        },
        writable: true,
        configurable: true,
    });
});

import { useTaskImport, mapStatus } from '../hooks/useTaskImport';
import { saveTaskExportSnapshot } from './taskExportCache';
import type { KanbanTask, KanbanColumn } from './kanbanTypes';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTask(id: string, title: string, status = 'todo'): KanbanTask {
    return { id, title, status, createdAt: 1000, updatedAt: 2000 };
}

const TARGET_COLUMNS: KanbanColumn[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
];

const SOURCE_COLUMNS: KanbanColumn[] = [
    { id: 'open', title: 'Open' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'closed', title: 'Closed' },
];

function seedSnapshot(teamId: string, teamName: string, tasks: KanbanTask[]) {
    saveTaskExportSnapshot(teamId, teamName, tasks, SOURCE_COLUMNS);
}

// ── mapStatus ─────────────────────────────────────────────────────────────────

describe('mapStatus', () => {
    it('maps to an exact matching column id', () => {
        expect(mapStatus('in-progress', TARGET_COLUMNS)).toBe('in-progress');
    });

    it('falls back to the first column when no match exists', () => {
        expect(mapStatus('open', TARGET_COLUMNS)).toBe('todo');
    });

    it('respects a custom status map before checking columns', () => {
        expect(mapStatus('open', TARGET_COLUMNS, { open: 'in-progress' })).toBe('in-progress');
    });
});

// ── useTaskImport ─────────────────────────────────────────────────────────────

describe('useTaskImport', () => {
    it('loads available snapshots on mount, excluding currentTeamId', () => {
        seedSnapshot('dead-team-a', 'Dead A', [makeTask('t1', 'Old Task')]);
        seedSnapshot('dead-team-b', 'Dead B', [makeTask('t2', 'Other Task')]);
        seedSnapshot('current', 'Current', [makeTask('t3', 'Live Task')]);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport: vi.fn(),
            })
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.availableSnapshots).toHaveLength(2);
        expect(result.current.availableSnapshots.every(s => s.teamId !== 'current')).toBe(true);
    });

    it('returns an empty list when no snapshots exist', () => {
        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'team-x',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport: vi.fn(),
            })
        );

        expect(result.current.availableSnapshots).toHaveLength(0);
    });

    it('previewImport analyses without side effects', () => {
        seedSnapshot('dead', 'Dead', [makeTask('t1', 'Task A')]);
        const existing = [makeTask('t1', 'Task A')]; // same id + content = skipped

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: existing,
                targetColumns: TARGET_COLUMNS,
                onImport: vi.fn(),
            })
        );

        const snapshot = result.current.availableSnapshots[0];
        const preview = result.current.previewImport(snapshot.tasks);

        expect(preview.skipped).toHaveLength(1);
        expect(preview.imported).toHaveLength(0);
        expect(preview.conflicts).toHaveLength(0);
    });

    it('executeImport calls onImport with new tasks and returns summary', async () => {
        const onImport = vi.fn();
        seedSnapshot('dead', 'Dead', [
            makeTask('new-1', 'New Task'),
            makeTask('new-2', 'Another New'),
        ]);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport,
            })
        );

        const snapshot = result.current.availableSnapshots[0];
        let summary: Awaited<ReturnType<typeof result.current.executeImport>>;

        await act(async () => {
            summary = await result.current.executeImport(snapshot);
        });

        expect(onImport).toHaveBeenCalledOnce();
        expect(summary!.added).toHaveLength(2);
        expect(summary!.imported).toHaveLength(2);
        expect(summary!.skipped).toHaveLength(0);
    });

    it('executeImport skips conflicted tasks with default policy', async () => {
        const onImport = vi.fn();
        const existing = [makeTask('t1', 'Original Title')];
        seedSnapshot('dead', 'Dead', [makeTask('t1', 'Different Title')]);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: existing,
                targetColumns: TARGET_COLUMNS,
                onImport,
            })
        );

        const snapshot = result.current.availableSnapshots[0];

        await act(async () => {
            await result.current.executeImport(snapshot); // conflictPolicy defaults to 'skip'
        });

        expect(onImport).not.toHaveBeenCalled();
    });

    it('executeImport overwrites with conflictPolicy=overwrite', async () => {
        const onImport = vi.fn();
        const existing = [makeTask('t1', 'Old Title')];
        seedSnapshot('dead', 'Dead', [makeTask('t1', 'New Title')]);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: existing,
                targetColumns: TARGET_COLUMNS,
                onImport,
            })
        );

        const snapshot = result.current.availableSnapshots[0];

        await act(async () => {
            await result.current.executeImport(snapshot, { conflictPolicy: 'overwrite' });
        });

        expect(onImport).toHaveBeenCalledOnce();
        const [addedTasks] = onImport.mock.calls[0];
        expect((addedTasks as KanbanTask[])[0].title).toBe('New Title');
    });

    it('executeImport maps statuses to target columns', async () => {
        const onImport = vi.fn();
        // Snapshot has 'open' and 'closed' statuses not in TARGET_COLUMNS
        saveTaskExportSnapshot('dead', 'Dead', [
            makeTask('t1', 'Open Task', 'open'),
            makeTask('t2', 'Closed Task', 'closed'),
        ], SOURCE_COLUMNS);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport,
            })
        );

        const snapshot = result.current.availableSnapshots[0];

        await act(async () => {
            await result.current.executeImport(snapshot, {
                statusMap: { open: 'todo', closed: 'done' },
            });
        });

        const [addedTasks] = onImport.mock.calls[0] as [KanbanTask[]];
        const statuses = addedTasks.map(t => t.status);
        expect(statuses).toContain('todo');
        expect(statuses).toContain('done');
    });

    it('executeImport filters by taskIds when provided', async () => {
        const onImport = vi.fn();
        seedSnapshot('dead', 'Dead', [
            makeTask('t1', 'Task 1'),
            makeTask('t2', 'Task 2'),
            makeTask('t3', 'Task 3'),
        ]);

        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport,
            })
        );

        const snapshot = result.current.availableSnapshots[0];

        await act(async () => {
            await result.current.executeImport(snapshot, { taskIds: ['t1', 't3'] });
        });

        const [addedTasks] = onImport.mock.calls[0] as [KanbanTask[]];
        expect(addedTasks).toHaveLength(2);
        expect(addedTasks.map(t => t.id).sort()).toEqual(['t1', 't3']);
    });

    it('refresh reloads snapshots from localStorage', () => {
        const { result } = renderHook(() =>
            useTaskImport({
                currentTeamId: 'current',
                existingTasks: [],
                targetColumns: TARGET_COLUMNS,
                onImport: vi.fn(),
            })
        );

        expect(result.current.availableSnapshots).toHaveLength(0);

        // Seed a snapshot after initial mount
        seedSnapshot('new-dead-team', 'New Dead', [makeTask('t1', 'Task')]);

        act(() => { result.current.refresh(); });

        expect(result.current.availableSnapshots).toHaveLength(1);
    });
});
