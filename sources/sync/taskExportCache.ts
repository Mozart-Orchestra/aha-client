import type { KanbanTask, KanbanColumn } from './kanbanTypes';

// ─── Storage helpers ──────────────────────────────────────────────────────────
// Thin wrappers over localStorage so tests can inject a mock via
// `Object.defineProperty(global, 'localStorage', ...)`.

function storageGet(key: string): string | null {
    return localStorage.getItem(key);
}

function storageSet(key: string, val: string): void {
    localStorage.setItem(key, val);
}

function storageDelete(key: string): void {
    localStorage.removeItem(key);
}

/**
 * Enumerate all localStorage keys using the index-based API so that a simple
 * mock ({ getItem, setItem, removeItem, length, key }) is sufficient in tests.
 */
function storageKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== null) keys.push(k);
    }
    return keys;
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const EXPORT_CACHE_VERSION = 'v1' as const;
export const EXPORT_CACHE_KEY_PREFIX = `aha:task-export:${EXPORT_CACHE_VERSION}:`;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Portable task record stored in the export snapshot.
 * Strips execution-specific fields (sessionIds, humanStatusLock, executionLinks,
 * approvalStatus, etc.) that are meaningless in a different team context.
 */
export interface ExportedTask {
    // Identity
    id: string;
    title: string;
    description?: string;

    // Status & priority
    status: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';

    // Timestamps
    createdAt: number;
    updatedAt: number;

    // Structure (preserves task hierarchy)
    parentTaskId?: string | null;
    subtaskIds?: string[];
    depth?: number;
    dependencies?: string[];

    // Content
    tags?: string[];
    dueDate?: number;

    // Checklist items (agent-agnostic content, useful to restore)
    checklists?: Array<{
        id: string;
        title: string;
        items: Array<{
            id: string;
            text: string;
            completed: boolean;
        }>;
    }>;

    // Provenance — preserved for dedup / conflict detection on import
    originalTeamId: string;
    originalTaskId: string;
}

/**
 * A full snapshot of one team's kanban board, stored per teamId.
 *
 * Key: `aha:task-export:v1:{teamId}`
 */
export interface TaskExportSnapshot {
    /** Schema version — bump when breaking changes are made to this format. */
    formatVersion: typeof EXPORT_CACHE_VERSION;

    /** Team that was snapshotted. */
    teamId: string;
    teamName: string;

    /** Unix ms timestamp of when this snapshot was captured. */
    exportedAt: number;

    /** Portable tasks (execution metadata stripped). */
    tasks: ExportedTask[];

    /** Column definitions needed to map statuses on import. */
    columns: KanbanColumn[];
}

/**
 * Result of merging incoming exported tasks into an existing board.
 */
export interface TaskImportResult {
    /** Tasks that were added to the board. */
    imported: ExportedTask[];
    /** Tasks skipped because an identical id already exists in the board. */
    skipped: ExportedTask[];
    /** Tasks whose id matched but whose content differed — caller decides policy. */
    conflicts: Array<{ incoming: ExportedTask; existing: KanbanTask }>;
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

export function getExportCacheKey(teamId: string): string {
    return `${EXPORT_CACHE_KEY_PREFIX}${teamId}`;
}

/**
 * Extract the teamId from a cache key.
 * Returns null when the key does not match the expected prefix.
 */
export function teamIdFromCacheKey(key: string): string | null {
    if (!key.startsWith(EXPORT_CACHE_KEY_PREFIX)) return null;
    return key.slice(EXPORT_CACHE_KEY_PREFIX.length) || null;
}

// ─── Serialisation ───────────────────────────────────────────────────────────

/**
 * Convert a raw KanbanTask into a portable ExportedTask by stripping
 * execution-specific fields that do not survive cross-team migration.
 */
export function toExportedTask(task: KanbanTask, teamId: string): ExportedTask {
    return {
        id: task.id,
        title: task.title,
        ...(task.description !== undefined && { description: task.description }),
        status: task.status,
        ...(task.priority !== undefined && { priority: task.priority }),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        ...(task.parentTaskId !== undefined && { parentTaskId: task.parentTaskId }),
        ...(task.subtaskIds?.length && { subtaskIds: [...task.subtaskIds] }),
        ...(task.depth !== undefined && { depth: task.depth }),
        ...(task.dependencies?.length && { dependencies: [...task.dependencies] }),
        ...(task.tags?.length && { tags: [...task.tags] }),
        ...(task.dueDate !== undefined && { dueDate: task.dueDate }),
        ...(task.checklists?.length && {
            checklists: task.checklists.map(cl => ({
                id: cl.id,
                title: cl.title,
                items: cl.items.map(item => ({
                    id: item.id,
                    text: item.text,
                    completed: item.completed,
                })),
            })),
        }),
        originalTeamId: teamId,
        originalTaskId: task.id,
    };
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Persist a snapshot of the team's tasks to localStorage.
 * Only non-deleted tasks are included.
 */
export function saveTaskExportSnapshot(
    teamId: string,
    teamName: string,
    tasks: KanbanTask[],
    columns: KanbanColumn[]
): TaskExportSnapshot {
    const exportable = tasks.filter(t => !t.isDeleted);
    const snapshot: TaskExportSnapshot = {
        formatVersion: EXPORT_CACHE_VERSION,
        teamId,
        teamName,
        exportedAt: Date.now(),
        tasks: exportable.map(t => toExportedTask(t, teamId)),
        columns: columns.map(c => ({ ...c })),
    };
    storageSet(getExportCacheKey(teamId), JSON.stringify(snapshot));
    return snapshot;
}

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Load the cached snapshot for a specific team.
 * Returns null when no cache exists or the data is corrupted.
 */
export function loadTaskExportSnapshot(teamId: string): TaskExportSnapshot | null {
    const raw = storageGet(getExportCacheKey(teamId));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as TaskExportSnapshot;
        if (parsed.formatVersion !== EXPORT_CACHE_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Load all cached snapshots from localStorage, optionally excluding a specific team.
 * Useful for the import picker: "choose from dead teams".
 */
export function loadAllTaskExportSnapshots(options?: {
    excludeTeamId?: string;
}): TaskExportSnapshot[] {
    const allKeys = storageKeys();
    const results: TaskExportSnapshot[] = [];

    for (const key of allKeys) {
        const teamId = teamIdFromCacheKey(key);
        if (!teamId) continue;
        if (options?.excludeTeamId && teamId === options.excludeTeamId) continue;

        const snapshot = loadTaskExportSnapshot(teamId);
        if (snapshot) results.push(snapshot);
    }

    // Newest snapshot first
    results.sort((a, b) => b.exportedAt - a.exportedAt);
    return results;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Remove the cached snapshot for a team.
 * Does nothing when no cache exists.
 */
export function clearTaskExportSnapshot(teamId: string): void {
    storageDelete(getExportCacheKey(teamId));
}

/**
 * Remove all task-export snapshots from localStorage.
 */
export function clearAllTaskExportSnapshots(): void {
    const allKeys = storageKeys();
    for (const key of allKeys) {
        if (key.startsWith(EXPORT_CACHE_KEY_PREFIX)) {
            storageDelete(key);
        }
    }
}

// ─── Import helpers ───────────────────────────────────────────────────────────

/**
 * Analyse which tasks from an export can be cleanly imported vs. need attention.
 *
 * Rules:
 * - **skipped**: `task.id` already exists in `existingTasks` AND content is identical
 * - **conflict**: `task.id` already exists but content differs (title/description/status)
 * - **imported**: `task.id` is new — safe to add
 */
export function analyseImport(
    incoming: ExportedTask[],
    existingTasks: KanbanTask[]
): TaskImportResult {
    const existingById = new Map<string, KanbanTask>(
        existingTasks.map(t => [t.id, t])
    );

    const result: TaskImportResult = {
        imported: [],
        skipped: [],
        conflicts: [],
    };

    for (const inTask of incoming) {
        const existing = existingById.get(inTask.id);
        if (!existing) {
            result.imported.push(inTask);
            continue;
        }

        const sameContent =
            existing.title === inTask.title &&
            existing.description === inTask.description &&
            existing.status === inTask.status;

        if (sameContent) {
            result.skipped.push(inTask);
        } else {
            result.conflicts.push({ incoming: inTask, existing });
        }
    }

    return result;
}

// ─── File export / import ─────────────────────────────────────────────────────

/**
 * Build a snapshot of the team's current tasks and trigger a browser JSON
 * file download so the user can archive or share tasks across sessions /
 * devices.  The downloaded file can be re-imported via importSnapshotFromJson.
 *
 * Only works in browser environments (uses Blob + URL.createObjectURL).
 */
export function exportTasksToJson(
    teamId: string,
    teamName: string,
    tasks: KanbanTask[],
    columns: KanbanColumn[],
): void {
    const exportable = tasks.filter(t => !t.isDeleted);
    const snapshot: TaskExportSnapshot = {
        formatVersion: EXPORT_CACHE_VERSION,
        teamId,
        teamName,
        exportedAt: Date.now(),
        tasks: exportable.map(t => toExportedTask(t, teamId)),
        columns: columns.map(c => ({ ...c })),
    };

    const json = JSON.stringify(snapshot, null, 2);
    const safeTeamName = teamName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').slice(0, 30);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `aha-tasks-${safeTeamName}-${date}.json`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse and validate a JSON string produced by exportTasksToJson().
 *
 * Returns the TaskExportSnapshot when the payload is valid and the
 * formatVersion matches; returns null on any parse error or schema mismatch.
 * Use this when loading a user-uploaded JSON file before passing it to
 * useTaskImport's executeImport().
 */
export function importSnapshotFromJson(json: string): TaskExportSnapshot | null {
    try {
        const parsed = JSON.parse(json) as TaskExportSnapshot;
        if (parsed.formatVersion !== EXPORT_CACHE_VERSION) return null;
        if (typeof parsed.teamId !== 'string' || !parsed.teamId) return null;
        if (!Array.isArray(parsed.tasks)) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Convert an ExportedTask back into a KanbanTask suitable for inserting into
 * the target team's board.
 *
 * Caller is responsible for:
 * - Resolving status mapping when the target board has different column IDs
 * - Assigning an assigneeId if desired
 */
export function toKanbanTask(
    exported: ExportedTask,
    overrides?: Partial<KanbanTask>
): KanbanTask {
    const now = Date.now();
    return {
        id: exported.id,
        title: exported.title,
        ...(exported.description !== undefined && { description: exported.description }),
        status: exported.status,
        ...(exported.priority !== undefined && { priority: exported.priority }),
        createdAt: exported.createdAt,
        updatedAt: now,
        ...(exported.parentTaskId !== undefined && { parentTaskId: exported.parentTaskId }),
        ...(exported.subtaskIds?.length && { subtaskIds: [...exported.subtaskIds] }),
        ...(exported.depth !== undefined && { depth: exported.depth }),
        ...(exported.dependencies?.length && { dependencies: [...exported.dependencies] }),
        ...(exported.tags?.length && { tags: [...exported.tags] }),
        ...(exported.dueDate !== undefined && { dueDate: exported.dueDate }),
        ...(exported.checklists?.length && {
            checklists: exported.checklists.map(cl => ({
                id: cl.id,
                title: cl.title,
                items: cl.items.map(item => ({
                    id: item.id,
                    text: item.text,
                    completed: item.completed,
                })),
            })),
        }),
        source: 'user' as const,
        ...overrides,
    };
}
