/**
 * useTaskExportAutoCache
 *
 * Automatically snapshots a team's kanban tasks to MMKV whenever the task list
 * changes. The snapshot survives team destruction and can later be imported into
 * a new team ("recover tasks from a dead team").
 *
 * Behaviour:
 * - Debounced auto-save: changes are coalesced over `DEBOUNCE_MS` to avoid
 *   thrashing on rapid sequential updates (e.g. bulk status changes).
 * - Final save on unmount: ensures the last state is captured even when the
 *   component unmounts without a preceding debounce flush.
 * - Manual trigger: `takeSnapshot()` flushes immediately.
 * - Skip empty boards: no snapshot written when the task list is empty (avoids
 *   overwriting a useful previous snapshot with a blank slate).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    saveTaskExportSnapshot,
    clearTaskExportSnapshot,
    type TaskExportSnapshot,
} from '@/sync/taskExportCache';
import type { KanbanTask, KanbanColumn } from '@/sync/kanbanTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Milliseconds to wait after the last task change before writing to MMKV. */
const DEBOUNCE_MS = 2_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseTaskExportAutoCacheOptions {
    teamId: string;
    teamName: string;
    tasks: KanbanTask[];
    columns: KanbanColumn[];
    /**
     * When false the hook is fully dormant — no reads or writes to MMKV.
     * Useful when the team is not yet ready or the user has disabled this feature.
     * @default true
     */
    enabled?: boolean;
    /**
     * Override the debounce window (ms). Primarily for testing.
     * @default 2000
     */
    debounceMs?: number;
}

export interface UseTaskExportAutoCacheResult {
    /** Unix ms timestamp of the last successful snapshot, or null before first save. */
    lastSavedAt: number | null;
    /** True while a debounce timer is pending (snapshot not yet flushed). */
    isPending: boolean;
    /**
     * Flush the current tasks to MMKV immediately, bypassing the debounce.
     * Returns the snapshot that was written.
     */
    takeSnapshot: () => TaskExportSnapshot | null;
    /**
     * Remove this team's cached snapshot from MMKV.
     * Useful when the team is intentionally deleted and its tasks are no longer
     * worth keeping.
     */
    clearSnapshot: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTaskExportAutoCache({
    teamId,
    teamName,
    tasks,
    columns,
    enabled = true,
    debounceMs = DEBOUNCE_MS,
}: UseTaskExportAutoCacheOptions): UseTaskExportAutoCacheResult {
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [isPending, setIsPending] = useState(false);

    // Keep stable refs so timer callbacks read the latest values without
    // needing to be in the dependency arrays.
    const tasksRef = useRef(tasks);
    const columnsRef = useRef(columns);
    const teamIdRef = useRef(teamId);
    const teamNameRef = useRef(teamName);
    const enabledRef = useRef(enabled);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update refs on every render so closures capture fresh values.
    tasksRef.current = tasks;
    columnsRef.current = columns;
    teamIdRef.current = teamId;
    teamNameRef.current = teamName;
    enabledRef.current = enabled;

    // ── Core flush ──────────────────────────────────────────────────────────

    const flush = useCallback((): TaskExportSnapshot | null => {
        if (!enabledRef.current) return null;

        const currentTasks = tasksRef.current;
        const currentColumns = columnsRef.current;
        const currentTeamId = teamIdRef.current;
        const currentTeamName = teamNameRef.current;

        // Never overwrite an existing useful snapshot with an empty board:
        // the empty state is likely just the initial render before data loads.
        if (currentTasks.length === 0) return null;

        const snapshot = saveTaskExportSnapshot(
            currentTeamId,
            currentTeamName,
            currentTasks,
            currentColumns
        );

        setLastSavedAt(snapshot.exportedAt);
        setIsPending(false);
        return snapshot;
    }, []); // stable — reads only via refs

    // ── Debounced auto-save when tasks change ───────────────────────────────

    useEffect(() => {
        if (!enabled) {
            // If disabled mid-session, cancel any pending timer.
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
                setIsPending(false);
            }
            return;
        }

        setIsPending(true);

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            flush();
        }, debounceMs);

        return () => {
            // Cleanup on next render cycle — the new effect will reschedule.
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
        // `flush` is stable; `debounceMs` is effectively constant per mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, enabled, debounceMs]);

    // ── Final snapshot on unmount ───────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (!enabledRef.current) return;

            // Cancel pending debounce and write immediately so we always capture
            // the last state when the component (team view) unmounts.
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            flush();
        };
        // Run cleanup only once on unmount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Public API ──────────────────────────────────────────────────────────

    const takeSnapshot = useCallback((): TaskExportSnapshot | null => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        return flush();
    }, [flush]);

    const clearSnapshot = useCallback((): void => {
        clearTaskExportSnapshot(teamIdRef.current);
        setLastSavedAt(null);
    }, []);

    return { lastSavedAt, isPending, takeSnapshot, clearSnapshot };
}
