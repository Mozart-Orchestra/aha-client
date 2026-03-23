/**
 * Task Import/Export — Integration Tests
 *
 * These tests verify the complete data flow across all three modules:
 *   - taskExportCache          (data layer: localStorage persistence, serialisation)
 *   - useTaskExportAutoCache   (auto-snapshot hook)
 *   - useTaskImport            (import hook: load, preview, execute)
 *
 * Each scenario simulates a real user story step by step, from a team
 * caching its tasks all the way to another team importing them.
 */

import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';

// ── Minimal renderHook shim ───────────────────────────────────────────────────
// Mirrors the shim used in the unit spec files to avoid an extra dependency.

function renderHook<P extends object, R>(
    hook: (p: P) => R,
    options?: { initialProps?: P }
): { result: { current: R }; rerender: (p: P) => void; unmount: () => void } {
    const result: { current: R } = { current: undefined as unknown as R };
    let renderer: ReturnType<typeof create>;

    function W(props: P) { result.current = hook(props); return null; }

    act(() => {
        renderer = create(React.createElement(W, options?.initialProps ?? ({} as P)));
    });

    return {
        result,
        rerender: (p: P) => act(() => renderer.update(React.createElement(W, p))),
        unmount: () => act(() => renderer.unmount()),
    };
}

// ── Mock localStorage ─────────────────────────────────────────────────────────
// One shared in-memory Map so that both hooks observe the same data,
// exactly as they would with a real browser localStorage.

const mockStorage = new Map<string, string>();

// ── Imports ───────────────────────────────────────────────────────────────────
import { useTaskExportAutoCache } from '../hooks/useTaskExportAutoCache';
import { useTaskImport } from '../hooks/useTaskImport';
import {
    saveTaskExportSnapshot,
    loadTaskExportSnapshot,
    EXPORT_CACHE_VERSION,
} from './taskExportCache';
import type { KanbanTask, KanbanColumn } from './kanbanTypes';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
    return {
        id: 'task-1',
        title: 'Task 1',
        status: 'todo',
        createdAt: 1_000,
        updatedAt: 2_000,
        ...overrides,
    };
}

/** Columns of the "dead" source team (different ids than target). */
const DEAD_COLUMNS: KanbanColumn[] = [
    { id: 'open', title: 'Open' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'closed', title: 'Closed' },
];

/** Columns of the "new" target team. */
const NEW_COLUMNS: KanbanColumn[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
];

// ── Test lifecycle ────────────────────────────────────────────────────────────

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
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ── Integration scenarios ─────────────────────────────────────────────────────

describe('Task Import/Export — End-to-End Integration', () => {

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 1: Full roundtrip via debounce — auto-cache then import all
    // ─────────────────────────────────────────────────────────────────────────
    it('full roundtrip (debounce): dead team caches tasks, new team imports all', async () => {
        const onImport = vi.fn();

        // Phase 1 — Dead team auto-caches via debounce.
        renderHook(() => useTaskExportAutoCache({
            teamId: 'dead-team',
            teamName: 'Dead Team',
            tasks: [
                makeTask({ id: 't1', title: 'Fix bug', status: 'open' }),
                makeTask({ id: 't2', title: 'Write docs', status: 'in-progress' }),
            ],
            columns: DEAD_COLUMNS,
            debounceMs: 100,
        }));

        act(() => { vi.advanceTimersByTime(100); });

        expect(loadTaskExportSnapshot('dead-team')).not.toBeNull();

        // Phase 2 — New team loads and imports.
        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'new-team',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        expect(result.current.availableSnapshots).toHaveLength(1);

        let summary: Awaited<ReturnType<typeof result.current.executeImport>>;
        await act(async () => {
            summary = await result.current.executeImport(
                result.current.availableSnapshots[0],
                { statusMap: { open: 'todo', closed: 'done' } }
            );
        });

        expect(onImport).toHaveBeenCalledOnce();
        expect(summary!.added).toHaveLength(2);
        expect(summary!.skipped).toHaveLength(0);
        expect(summary!.conflicts).toHaveLength(0);

        // Status mapping: 'open' → 'todo', 'in-progress' stays 'in-progress'.
        const added = onImport.mock.calls[0][0] as KanbanTask[];
        const byId = Object.fromEntries(added.map(t => [t.id, t.status]));
        expect(byId['t1']).toBe('todo');
        expect(byId['t2']).toBe('in-progress');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 2: Full roundtrip via unmount — team dies mid-session
    // ─────────────────────────────────────────────────────────────────────────
    it('full roundtrip (unmount): snapshot persists after team component unmounts', async () => {
        const onImport = vi.fn();

        // Phase 1 — Team unmounts before debounce fires; flush happens in cleanup.
        const { unmount } = renderHook(() => useTaskExportAutoCache({
            teamId: 'dying-team',
            teamName: 'Dying Team',
            tasks: [makeTask({ id: 'u1', title: 'Unfinished Task', status: 'open' })],
            columns: DEAD_COLUMNS,
            debounceMs: 60_000, // intentionally long — never fires naturally
        }));

        expect(loadTaskExportSnapshot('dying-team')).toBeNull();
        unmount(); // triggers final flush in cleanup effect
        expect(loadTaskExportSnapshot('dying-team')).not.toBeNull();

        // Phase 2 — Recovery team imports the single unfinished task.
        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'recovery-team',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        expect(result.current.availableSnapshots).toHaveLength(1);
        expect(result.current.availableSnapshots[0].teamId).toBe('dying-team');

        await act(async () => {
            await result.current.executeImport(result.current.availableSnapshots[0]);
        });

        expect(onImport).toHaveBeenCalledOnce();
        const added = onImport.mock.calls[0][0] as KanbanTask[];
        expect(added[0].title).toBe('Unfinished Task');
        // toKanbanTask always sets source = 'user'
        expect(added[0].source).toBe('user');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 3: Conflict detection — default skip policy
    // ─────────────────────────────────────────────────────────────────────────
    it('conflict detection: skips tasks whose id exists with different content (default policy)', async () => {
        const onImport = vi.fn();

        saveTaskExportSnapshot(
            'dead-c',
            'Dead C',
            [makeTask({ id: 'shared', title: 'Newer Version', status: 'in-progress' })],
            DEAD_COLUMNS
        );

        // Target board already has the same id but different content.
        const existingTasks: KanbanTask[] = [
            makeTask({ id: 'shared', title: 'Original Version', status: 'todo' }),
        ];

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'target-c',
            existingTasks,
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        let summary: Awaited<ReturnType<typeof result.current.executeImport>>;
        await act(async () => {
            summary = await result.current.executeImport(result.current.availableSnapshots[0]);
        });

        // Conflict detected; nothing imported; onImport never called.
        expect(summary!.conflicts).toHaveLength(1);
        expect(summary!.added).toHaveLength(0);
        expect(onImport).not.toHaveBeenCalled();

        // Conflict entry carries both versions for UI display.
        expect(summary!.conflicts[0].incoming.title).toBe('Newer Version');
        expect(summary!.conflicts[0].existing.title).toBe('Original Version');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 4: Conflict resolution — overwrite policy
    // ─────────────────────────────────────────────────────────────────────────
    it('conflict resolution: overwrite policy replaces conflicting tasks', async () => {
        const onImport = vi.fn();

        saveTaskExportSnapshot(
            'dead-o',
            'Dead O',
            [
                makeTask({ id: 'shared', title: 'Updated Title', status: 'open' }),
                makeTask({ id: 'brand-new', title: 'Brand New', status: 'open' }),
            ],
            DEAD_COLUMNS
        );

        const existingTasks: KanbanTask[] = [
            makeTask({ id: 'shared', title: 'Old Title', status: 'todo' }),
        ];

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'target-o',
            existingTasks,
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        await act(async () => {
            await result.current.executeImport(
                result.current.availableSnapshots[0],
                { conflictPolicy: 'overwrite', statusMap: { open: 'todo', closed: 'done' } }
            );
        });

        expect(onImport).toHaveBeenCalledOnce();
        const added = onImport.mock.calls[0][0] as KanbanTask[];
        expect(added).toHaveLength(2); // overwritten + genuinely new
        const titles = added.map(t => t.title).sort();
        expect(titles).toContain('Updated Title');
        expect(titles).toContain('Brand New');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 5: Status mapping — unknown status falls back to first column
    // ─────────────────────────────────────────────────────────────────────────
    it('status mapping: unmapped status falls back to first target column', async () => {
        const onImport = vi.fn();

        saveTaskExportSnapshot(
            'dead-s',
            'Dead S',
            [makeTask({ id: 'weird', title: 'Weird Task', status: 'in-review' })],
            [{ id: 'in-review', title: 'In Review' }] // source has a custom column
        );

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'target-s',
            existingTasks: [],
            targetColumns: NEW_COLUMNS, // 'in-review' not present
            onImport,
        }));

        await act(async () => {
            await result.current.executeImport(result.current.availableSnapshots[0]);
        });

        const added = onImport.mock.calls[0][0] as KanbanTask[];
        // Falls back to first column: 'todo'
        expect(added[0].status).toBe('todo');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 6: Selective import via taskIds filter
    // ─────────────────────────────────────────────────────────────────────────
    it('selective import: taskIds filter restricts which tasks are processed', async () => {
        const onImport = vi.fn();

        saveTaskExportSnapshot(
            'dead-f',
            'Dead F',
            [
                makeTask({ id: 'a', title: 'Task A', status: 'open' }),
                makeTask({ id: 'b', title: 'Task B', status: 'open' }),
                makeTask({ id: 'c', title: 'Task C', status: 'open' }),
            ],
            DEAD_COLUMNS
        );

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'target-f',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        await act(async () => {
            await result.current.executeImport(
                result.current.availableSnapshots[0],
                { taskIds: ['a', 'c'] }
            );
        });

        const added = onImport.mock.calls[0][0] as KanbanTask[];
        expect(added).toHaveLength(2);
        expect(added.map(t => t.id).sort()).toEqual(['a', 'c']);
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 7: Multiple dead teams — current team excluded, newest first
    // ─────────────────────────────────────────────────────────────────────────
    it('multi-team: all dead teams available, current team excluded, sorted newest first', () => {
        vi.setSystemTime(1_000);
        saveTaskExportSnapshot('alpha', 'Alpha', [makeTask({ id: 'a1' })], DEAD_COLUMNS);

        vi.setSystemTime(5_000);
        saveTaskExportSnapshot('beta', 'Beta', [makeTask({ id: 'b1' })], DEAD_COLUMNS);

        vi.setSystemTime(3_000);
        saveTaskExportSnapshot('gamma', 'Gamma', [makeTask({ id: 'g1' })], DEAD_COLUMNS);

        // Current team also has a snapshot — must be excluded from the list.
        vi.setSystemTime(9_000);
        saveTaskExportSnapshot('current', 'Current', [makeTask({ id: 'c1' })], NEW_COLUMNS);

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'current',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport: vi.fn(),
        }));

        const snapshots = result.current.availableSnapshots;
        expect(snapshots).toHaveLength(3);
        expect(snapshots.every(s => s.teamId !== 'current')).toBe(true);
        // Sorted by exportedAt descending: beta (5000) > gamma (3000) > alpha (1000)
        expect(snapshots[0].teamId).toBe('beta');
        expect(snapshots[1].teamId).toBe('gamma');
        expect(snapshots[2].teamId).toBe('alpha');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 8: refresh() reloads snapshots written after initial mount
    // ─────────────────────────────────────────────────────────────────────────
    it('refresh: picks up snapshots written after the hook mounted', () => {
        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'active-team',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport: vi.fn(),
        }));

        expect(result.current.availableSnapshots).toHaveLength(0);

        // A dead team's snapshot is written after the hook already mounted.
        act(() => {
            saveTaskExportSnapshot(
                'late-dead',
                'Late Dead',
                [makeTask({ id: 'ld1', title: 'Late Task' })],
                DEAD_COLUMNS
            );
        });

        act(() => { result.current.refresh(); });

        expect(result.current.availableSnapshots).toHaveLength(1);
        expect(result.current.availableSnapshots[0].teamId).toBe('late-dead');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 9: previewImport is pure (no side effects, idempotent)
    // ─────────────────────────────────────────────────────────────────────────
    it('previewImport is pure: can be called multiple times without mutating state', () => {
        const onImport = vi.fn();

        saveTaskExportSnapshot(
            'source-team',
            'Source',
            [
                makeTask({ id: 'new-p', title: 'Preview Task' }),
                makeTask({ id: 'same-p', title: 'Same Task' }),
            ],
            DEAD_COLUMNS
        );

        const existingTasks: KanbanTask[] = [
            makeTask({ id: 'same-p', title: 'Same Task', status: 'todo' }),
        ];

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'preview-target',
            existingTasks,
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        const snapshot = result.current.availableSnapshots[0];

        const preview1 = result.current.previewImport(snapshot.tasks);
        const preview2 = result.current.previewImport(snapshot.tasks);

        expect(preview1.imported).toHaveLength(1);
        expect(preview1.skipped).toHaveLength(1);
        expect(preview1.conflicts).toHaveLength(0);
        // Idempotent
        expect(preview1.imported[0].id).toEqual(preview2.imported[0].id);
        expect(preview1.skipped[0].id).toEqual(preview2.skipped[0].id);
        // onImport was never triggered by preview
        expect(onImport).not.toHaveBeenCalled();
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 10: Execution fields stripped, portable fields preserved
    // ─────────────────────────────────────────────────────────────────────────
    it('snapshot structure: execution fields absent, portable fields intact after import', async () => {
        const onImport = vi.fn();

        const richTask: KanbanTask = makeTask({
            id: 'rich-1',
            title: 'Rich Task',
            description: 'Some description',
            status: 'open',
            priority: 'high',
            tags: ['backend', 'urgent'],
            // Execution-specific — must be stripped from the snapshot
            assigneeId: 'session-abc',
            approvalStatus: 'pending',
            approvedBy: ['session-xyz'],
            humanStatusLock: { mode: 'editing', lockedAt: 999 },
            executionLinks: [{ sessionId: 's1', linkedAt: 1, role: 'primary', status: 'active' }],
        });

        saveTaskExportSnapshot('rich-dead', 'Rich Dead', [richTask], DEAD_COLUMNS);

        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'target-rich',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        await act(async () => {
            await result.current.executeImport(result.current.availableSnapshots[0]);
        });

        const added = onImport.mock.calls[0][0] as KanbanTask[];
        const t = added[0];

        // Portable fields preserved
        expect(t.title).toBe('Rich Task');
        expect(t.description).toBe('Some description');
        expect(t.priority).toBe('high');
        expect(t.tags).toEqual(['backend', 'urgent']);
        expect(t.source).toBe('user');

        // Execution-specific fields must be absent
        expect(t.assigneeId).toBeUndefined();
        expect(t.approvalStatus).toBeUndefined();
        expect(t.approvedBy).toBeUndefined();
        expect(t.humanStatusLock).toBeUndefined();
        expect(t.executionLinks).toBeUndefined();
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 11: Deleted tasks excluded from snapshot and not importable
    // ─────────────────────────────────────────────────────────────────────────
    it('deleted tasks: excluded from snapshot, absent from import results', async () => {
        const onImport = vi.fn();

        renderHook(() => useTaskExportAutoCache({
            teamId: 'del-team',
            teamName: 'Del Team',
            tasks: [
                makeTask({ id: 'keep-1', title: 'Keep Me', status: 'open' }),
                makeTask({ id: 'del-1', title: 'Delete Me', status: 'open', isDeleted: true }),
            ],
            columns: DEAD_COLUMNS,
            debounceMs: 50,
        }));

        act(() => { vi.advanceTimersByTime(50); });

        // Snapshot must contain only the non-deleted task.
        const snapshot = loadTaskExportSnapshot('del-team');
        expect(snapshot!.tasks).toHaveLength(1);
        expect(snapshot!.tasks[0].id).toBe('keep-1');

        // Import sees only the kept task.
        const { result } = renderHook(() => useTaskImport({
            currentTeamId: 'import-del-target',
            existingTasks: [],
            targetColumns: NEW_COLUMNS,
            onImport,
        }));

        await act(async () => {
            await result.current.executeImport(result.current.availableSnapshots[0]);
        });

        const added = onImport.mock.calls[0][0] as KanbanTask[];
        expect(added).toHaveLength(1);
        expect(added[0].id).toBe('keep-1');
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  Scenario 12: Snapshot metadata integrity
    // ─────────────────────────────────────────────────────────────────────────
    it('snapshot metadata: formatVersion, teamName, teamId, exportedAt, columns are correct', () => {
        vi.setSystemTime(42_000);

        renderHook(() => useTaskExportAutoCache({
            teamId: 'meta-team',
            teamName: 'Meta Team',
            tasks: [makeTask({ id: 'm1', title: 'Meta Task' })],
            columns: DEAD_COLUMNS,
            debounceMs: 0, // fire immediately so system time stays at 42_000
        }));

        act(() => { vi.advanceTimersByTime(0); }); // fire timeout without advancing system time

        const snapshot = loadTaskExportSnapshot('meta-team')!;
        expect(snapshot.formatVersion).toBe(EXPORT_CACHE_VERSION);
        expect(snapshot.teamId).toBe('meta-team');
        expect(snapshot.teamName).toBe('Meta Team');
        expect(snapshot.exportedAt).toBe(42_000);
        expect(snapshot.columns).toEqual(DEAD_COLUMNS);
    });
});
