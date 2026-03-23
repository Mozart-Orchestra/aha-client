import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';

// Minimal renderHook shim using react-test-renderer (no external testing-library needed).
type RenderHookResult<Props, Result> = {
    result: { current: Result };
    rerender: (newProps: Props) => void;
    unmount: () => void;
};

function renderHook<Props extends object, Result>(
    hook: (props: Props) => Result,
    options?: { initialProps?: Props }
): RenderHookResult<Props, Result> {
    let result: { current: Result } = { current: undefined as unknown as Result };
    let renderer: ReturnType<typeof create>;

    function Wrapper(props: Props) {
        result.current = hook(props);
        return null;
    }

    act(() => {
        renderer = create(React.createElement(Wrapper, options?.initialProps ?? ({} as Props)));
    });

    return {
        result,
        rerender: (newProps: Props) => {
            act(() => {
                renderer.update(React.createElement(Wrapper, newProps));
            });
        },
        unmount: () => {
            act(() => {
                renderer.unmount();
            });
        },
    };
}

// ── Mock localStorage ─────────────────────────────────────────────────────────
// useTaskExportAutoCache delegates persistence to taskExportCache which uses
// localStorage. We inject a simple in-memory mock before each test.

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
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

import { useTaskExportAutoCache } from '../hooks/useTaskExportAutoCache';
import { loadTaskExportSnapshot } from './taskExportCache';
import type { KanbanTask, KanbanColumn } from './kanbanTypes';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTask(id: string, title: string): KanbanTask {
    return {
        id,
        title,
        status: 'todo',
        createdAt: 1000,
        updatedAt: 2000,
    };
}

const COLUMNS: KanbanColumn[] = [{ id: 'todo', title: 'To Do' }];

const BASE_OPTIONS = {
    teamId: 'team-test',
    teamName: 'Test Team',
    tasks: [makeTask('t1', 'Task 1')],
    columns: COLUMNS,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTaskExportAutoCache', () => {
    it('does not save immediately on mount', () => {
        renderHook(() => useTaskExportAutoCache(BASE_OPTIONS));
        // debounce has not fired yet
        expect(loadTaskExportSnapshot('team-test')).toBeNull();
    });

    it('saves after the debounce window', () => {
        renderHook(() => useTaskExportAutoCache({ ...BASE_OPTIONS, debounceMs: 500 }));

        act(() => {
            vi.advanceTimersByTime(500);
        });

        const snapshot = loadTaskExportSnapshot('team-test');
        expect(snapshot).not.toBeNull();
        expect(snapshot!.teamId).toBe('team-test');
        expect(snapshot!.tasks).toHaveLength(1);
    });

    it('debounces: resets timer when tasks change rapidly', () => {
        const { rerender } = renderHook(
            (props: typeof BASE_OPTIONS) => useTaskExportAutoCache(props),
            { initialProps: { ...BASE_OPTIONS, debounceMs: 500 } }
        );

        act(() => { vi.advanceTimersByTime(300); }); // not yet fired

        // New tasks arrive before the debounce fires
        rerender({ ...BASE_OPTIONS, debounceMs: 500, tasks: [makeTask('t1', 'Task 1'), makeTask('t2', 'Task 2')] });

        act(() => { vi.advanceTimersByTime(300); }); // still not fired (reset)
        expect(loadTaskExportSnapshot('team-test')).toBeNull();

        act(() => { vi.advanceTimersByTime(200); }); // now at 500ms since rerender
        const snapshot = loadTaskExportSnapshot('team-test');
        expect(snapshot).not.toBeNull();
        expect(snapshot!.tasks).toHaveLength(2);
    });

    it('takeSnapshot flushes immediately', () => {
        const { result } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, debounceMs: 5_000 })
        );

        act(() => {
            result.current.takeSnapshot();
        });

        const snapshot = loadTaskExportSnapshot('team-test');
        expect(snapshot).not.toBeNull();
        expect(result.current.lastSavedAt).not.toBeNull();
        expect(result.current.isPending).toBe(false);
    });

    it('clearSnapshot removes the localStorage entry and resets lastSavedAt', () => {
        const { result } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, debounceMs: 100 })
        );

        act(() => { vi.advanceTimersByTime(100); });
        expect(loadTaskExportSnapshot('team-test')).not.toBeNull();

        act(() => { result.current.clearSnapshot(); });
        expect(loadTaskExportSnapshot('team-test')).toBeNull();
        expect(result.current.lastSavedAt).toBeNull();
    });

    it('writes a final snapshot on unmount', () => {
        const { unmount } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, debounceMs: 10_000 })
        );

        // Timer has not fired, but unmount should flush immediately.
        unmount();

        const snapshot = loadTaskExportSnapshot('team-test');
        expect(snapshot).not.toBeNull();
        expect(snapshot!.tasks).toHaveLength(1);
    });

    it('skips saving when tasks is empty', () => {
        const { result } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, tasks: [], debounceMs: 100 })
        );

        act(() => { vi.advanceTimersByTime(100); });

        expect(loadTaskExportSnapshot('team-test')).toBeNull();
        // takeSnapshot also skips when empty
        const snap = result.current.takeSnapshot();
        expect(snap).toBeNull();
    });

    it('is dormant when enabled=false', () => {
        const { result } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, enabled: false, debounceMs: 100 })
        );

        act(() => { vi.advanceTimersByTime(100); });

        expect(loadTaskExportSnapshot('team-test')).toBeNull();
        const snap = result.current.takeSnapshot();
        expect(snap).toBeNull();
    });

    it('updates lastSavedAt after each successful flush', () => {
        vi.setSystemTime(1_000);
        const { result } = renderHook(() =>
            useTaskExportAutoCache({ ...BASE_OPTIONS, debounceMs: 100 })
        );

        act(() => { vi.advanceTimersByTime(100); });
        const first = result.current.lastSavedAt;
        expect(first).toBeGreaterThan(0);

        vi.setSystemTime(9_000);
        act(() => { result.current.takeSnapshot(); });
        const second = result.current.lastSavedAt;
        expect(second).toBeGreaterThan(first!);
    });
});
