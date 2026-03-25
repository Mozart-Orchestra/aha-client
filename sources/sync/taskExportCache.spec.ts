import { describe, expect, it, beforeEach, vi } from 'vitest';

// ── Mock localStorage ─────────────────────────────────────────────────────────
// taskExportCache.ts uses localStorage (not MMKV), so we inject a simple
// in-memory implementation into the global scope before each test.

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

// ── Import AFTER mock is in place ─────────────────────────────────────────────
import {
    EXPORT_CACHE_KEY_PREFIX,
    EXPORT_CACHE_VERSION,
    analyseImport,
    clearAllTaskExportSnapshots,
    clearTaskExportSnapshot,
    exportTasksToJson,
    getExportCacheKey,
    importSnapshotFromJson,
    loadAllTaskExportSnapshots,
    loadTaskExportSnapshot,
    saveTaskExportSnapshot,
    teamIdFromCacheKey,
    toExportedTask,
    toKanbanTask,
} from './taskExportCache';
import type { KanbanTask, KanbanColumn } from './kanbanTypes';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
    return {
        id: 'task-1',
        title: 'Fix the bug',
        status: 'todo',
        createdAt: 1000,
        updatedAt: 2000,
        ...overrides,
    };
}

const COLUMNS: KanbanColumn[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
];

// ── Key helpers ───────────────────────────────────────────────────────────────

describe('getExportCacheKey', () => {
    it('formats the key with the expected prefix and teamId', () => {
        expect(getExportCacheKey('team-abc')).toBe(
            `aha:task-export:${EXPORT_CACHE_VERSION}:team-abc`
        );
    });
});

describe('teamIdFromCacheKey', () => {
    it('extracts the teamId from a valid key', () => {
        expect(teamIdFromCacheKey(`${EXPORT_CACHE_KEY_PREFIX}team-xyz`)).toBe('team-xyz');
    });

    it('returns null for an unrelated key', () => {
        expect(teamIdFromCacheKey('other:key:team-xyz')).toBeNull();
    });

    it('returns null when the key equals the prefix with no teamId', () => {
        expect(teamIdFromCacheKey(EXPORT_CACHE_KEY_PREFIX)).toBeNull();
    });
});

// ── toExportedTask ────────────────────────────────────────────────────────────

describe('toExportedTask', () => {
    it('strips execution-specific fields', () => {
        const task = makeTask({
            assigneeId: 'session-123',
            executionLinks: [{ sessionId: 'x', linkedAt: 1, role: 'primary', status: 'active' }],
            humanStatusLock: { mode: 'editing', lockedAt: 1 },
            approvalStatus: 'pending',
            approvedBy: ['y'],
        });

        const exported = toExportedTask(task, 'team-a');

        expect(exported).not.toHaveProperty('assigneeId');
        expect(exported).not.toHaveProperty('executionLinks');
        expect(exported).not.toHaveProperty('humanStatusLock');
        expect(exported).not.toHaveProperty('approvalStatus');
        expect(exported).not.toHaveProperty('approvedBy');
    });

    it('preserves portable fields', () => {
        const task = makeTask({
            description: 'Detailed desc',
            priority: 'high',
            tags: ['backend', 'urgent'],
            comments: [{
                id: 'comment-1',
                authorSessionId: 'session-1',
                authorRole: 'builder',
                authorDisplayName: 'Builder One',
                type: 'note',
                content: 'Important implementation detail',
                createdAt: 1234,
                mentions: ['session-2'],
            }],
            checklists: [{
                id: 'cl-1',
                title: 'Steps',
                items: [{ id: 'i1', text: 'Step 1', completed: false }],
            }],
        });

        const exported = toExportedTask(task, 'team-b');

        expect(exported.title).toBe('Fix the bug');
        expect(exported.description).toBe('Detailed desc');
        expect(exported.priority).toBe('high');
        expect(exported.tags).toEqual(['backend', 'urgent']);
        expect(exported.comments?.[0].content).toBe('Important implementation detail');
        expect(exported.comments?.[0].mentions).toEqual(['session-2']);
        expect(exported.checklists?.[0].items[0].text).toBe('Step 1');
        expect(exported.originalTeamId).toBe('team-b');
        expect(exported.originalTaskId).toBe('task-1');
    });

    it('omits optional fields when not present', () => {
        const exported = toExportedTask(makeTask(), 'team-c');
        expect(exported).not.toHaveProperty('description');
        expect(exported).not.toHaveProperty('tags');
        expect(exported).not.toHaveProperty('checklists');
    });

    it('excludes deleted tasks when called via saveTaskExportSnapshot', () => {
        const tasks = [
            makeTask({ id: 't1', title: 'Keep' }),
            makeTask({ id: 't2', title: 'Deleted', isDeleted: true }),
        ];
        const snapshot = saveTaskExportSnapshot('team-d', 'Team D', tasks, COLUMNS);
        expect(snapshot.tasks).toHaveLength(1);
        expect(snapshot.tasks[0].id).toBe('t1');
    });
});

// ── save / load ───────────────────────────────────────────────────────────────

describe('saveTaskExportSnapshot / loadTaskExportSnapshot', () => {
    it('round-trips a snapshot', () => {
        const tasks = [makeTask()];
        saveTaskExportSnapshot('team-1', 'My Team', tasks, COLUMNS);

        const loaded = loadTaskExportSnapshot('team-1');
        expect(loaded).not.toBeNull();
        expect(loaded!.teamId).toBe('team-1');
        expect(loaded!.teamName).toBe('My Team');
        expect(loaded!.formatVersion).toBe(EXPORT_CACHE_VERSION);
        expect(loaded!.tasks).toHaveLength(1);
        expect(loaded!.columns).toHaveLength(3);
    });

    it('returns null when no snapshot exists', () => {
        expect(loadTaskExportSnapshot('nonexistent')).toBeNull();
    });

    it('overwrites previous snapshot for the same team', () => {
        saveTaskExportSnapshot('team-1', 'Old Name', [makeTask()], COLUMNS);
        saveTaskExportSnapshot('team-1', 'New Name', [makeTask(), makeTask({ id: 't2', title: 'Second' })], COLUMNS);

        const loaded = loadTaskExportSnapshot('team-1');
        expect(loaded!.teamName).toBe('New Name');
        expect(loaded!.tasks).toHaveLength(2);
    });
});

// ── loadAllTaskExportSnapshots ────────────────────────────────────────────────

describe('loadAllTaskExportSnapshots', () => {
    it('returns all cached snapshots sorted by exportedAt descending', () => {
        vi.useFakeTimers();

        vi.setSystemTime(1000);
        saveTaskExportSnapshot('team-old', 'Old', [makeTask()], COLUMNS);

        vi.setSystemTime(9000);
        saveTaskExportSnapshot('team-new', 'New', [makeTask()], COLUMNS);

        vi.useRealTimers();

        const all = loadAllTaskExportSnapshots();
        expect(all).toHaveLength(2);
        expect(all[0].teamId).toBe('team-new');
        expect(all[1].teamId).toBe('team-old');
    });

    it('excludes the specified teamId', () => {
        saveTaskExportSnapshot('active', 'Active', [makeTask()], COLUMNS);
        saveTaskExportSnapshot('dead', 'Dead', [makeTask()], COLUMNS);

        const all = loadAllTaskExportSnapshots({ excludeTeamId: 'active' });
        expect(all.every(s => s.teamId !== 'active')).toBe(true);
        expect(all).toHaveLength(1);
    });
});

// ── clearTaskExportSnapshot ───────────────────────────────────────────────────

describe('clearTaskExportSnapshot', () => {
    it('removes the snapshot for the given team', () => {
        saveTaskExportSnapshot('team-x', 'X', [makeTask()], COLUMNS);
        clearTaskExportSnapshot('team-x');
        expect(loadTaskExportSnapshot('team-x')).toBeNull();
    });

    it('is a no-op when the team has no snapshot', () => {
        expect(() => clearTaskExportSnapshot('nonexistent')).not.toThrow();
    });
});

describe('clearAllTaskExportSnapshots', () => {
    it('removes all task-export snapshots', () => {
        saveTaskExportSnapshot('a', 'A', [makeTask()], COLUMNS);
        saveTaskExportSnapshot('b', 'B', [makeTask()], COLUMNS);
        clearAllTaskExportSnapshots();
        expect(loadAllTaskExportSnapshots()).toHaveLength(0);
    });
});

// ── analyseImport ─────────────────────────────────────────────────────────────

describe('analyseImport', () => {
    it('marks tasks as imported when they do not exist on the board', () => {
        const incoming = [toExportedTask(makeTask({ id: 'new-1', title: 'New task' }), 'src')];
        const result = analyseImport(incoming, []);
        expect(result.imported).toHaveLength(1);
        expect(result.skipped).toHaveLength(0);
        expect(result.conflicts).toHaveLength(0);
    });

    it('marks tasks as skipped when identical content already exists', () => {
        const task = makeTask();
        const incoming = [toExportedTask(task, 'src')];
        const result = analyseImport(incoming, [task]);
        expect(result.skipped).toHaveLength(1);
        expect(result.imported).toHaveLength(0);
        expect(result.conflicts).toHaveLength(0);
    });

    it('marks tasks as conflicts when id matches but content differs', () => {
        const existing = makeTask({ title: 'Original' });
        const incoming = [toExportedTask(makeTask({ title: 'Modified' }), 'src')];
        const result = analyseImport(incoming, [existing]);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].incoming.title).toBe('Modified');
        expect(result.conflicts[0].existing.title).toBe('Original');
    });

    it('marks tasks as conflicts when comments differ for the same id', () => {
        const existing = makeTask({
            comments: [{
                id: 'comment-1',
                authorSessionId: 'session-1',
                type: 'note',
                content: 'Old comment',
                createdAt: 100,
            }],
        });
        const incoming = [toExportedTask(makeTask({
            comments: [{
                id: 'comment-1',
                authorSessionId: 'session-1',
                type: 'note',
                content: 'Newer comment',
                createdAt: 100,
            }],
        }), 'src')];

        const result = analyseImport(incoming, [existing]);
        expect(result.imported).toHaveLength(0);
        expect(result.skipped).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('handles a mix of imported, skipped, and conflicted tasks', () => {
        const tasks = [
            makeTask({ id: 'new-task', title: 'New' }),
            makeTask({ id: 'same-task', title: 'Same', status: 'todo' }),
            makeTask({ id: 'diff-task', title: 'Changed title' }),
        ];
        const incoming = tasks.map(t => toExportedTask(t, 'src'));

        const existing: KanbanTask[] = [
            makeTask({ id: 'same-task', title: 'Same', status: 'todo' }),
            makeTask({ id: 'diff-task', title: 'Original title' }),
        ];

        const result = analyseImport(incoming, existing);
        expect(result.imported).toHaveLength(1);
        expect(result.skipped).toHaveLength(1);
        expect(result.conflicts).toHaveLength(1);
    });
});

// ── toKanbanTask ──────────────────────────────────────────────────────────────

describe('toKanbanTask', () => {
    it('reconstructs a KanbanTask from an ExportedTask', () => {
        const original = makeTask({
            description: 'desc',
            priority: 'low',
            tags: ['x'],
            comments: [{
                id: 'comment-1',
                authorSessionId: 'session-1',
                type: 'decision',
                content: 'Ship it',
                createdAt: 4567,
            }],
        });
        const exported = toExportedTask(original, 'team-z');
        const restored = toKanbanTask(exported);

        expect(restored.id).toBe(original.id);
        expect(restored.title).toBe(original.title);
        expect(restored.description).toBe('desc');
        expect(restored.priority).toBe('low');
        expect(restored.tags).toEqual(['x']);
        expect(restored.comments).toEqual(original.comments);
        expect(restored.source).toBe('user');
    });

    it('applies overrides on top of restored fields', () => {
        const exported = toExportedTask(makeTask(), 'team-z');
        const restored = toKanbanTask(exported, { status: 'in-progress', assigneeId: 'sess-1' });
        expect(restored.status).toBe('in-progress');
        expect(restored.assigneeId).toBe('sess-1');
    });
});

// ── exportTasksToJson ─────────────────────────────────────────────────────────

describe('exportTasksToJson', () => {
    const mockClick = vi.fn();
    const mockAnchor = { href: '', download: '', click: mockClick };
    let capturedBlobParts: string[] = [];

    beforeEach(() => {
        mockClick.mockClear();
        mockAnchor.href = '';
        mockAnchor.download = '';
        capturedBlobParts = [];

        Object.defineProperty(global, 'Blob', {
            value: class MockBlob {
                constructor(parts: string[]) { capturedBlobParts = parts; }
            },
            writable: true,
            configurable: true,
        });

        Object.defineProperty(global, 'URL', {
            value: {
                createObjectURL: vi.fn(() => 'blob:test-url'),
                revokeObjectURL: vi.fn(),
            },
            writable: true,
            configurable: true,
        });

        Object.defineProperty(global, 'document', {
            value: {
                createElement: vi.fn(() => mockAnchor),
                body: {
                    appendChild: vi.fn(),
                    removeChild: vi.fn(),
                },
            },
            writable: true,
            configurable: true,
        });
    });

    it('triggers a download by calling anchor.click()', () => {
        exportTasksToJson('team-1', 'My Team', [makeTask()], COLUMNS);
        expect(mockClick).toHaveBeenCalledOnce();
    });

    it('sets the anchor href to the blob URL', () => {
        exportTasksToJson('team-1', 'My Team', [makeTask()], COLUMNS);
        expect(mockAnchor.href).toBe('blob:test-url');
    });

    it('generates a filename matching aha-tasks-<name>-<date>.json', () => {
        exportTasksToJson('team-1', 'My Team', [makeTask()], COLUMNS);
        expect(mockAnchor.download).toMatch(/^aha-tasks-My-Team-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('serialises a valid TaskExportSnapshot into the blob', () => {
        exportTasksToJson('team-1', 'My Team', [makeTask({
            comments: [{
                id: 'comment-1',
                authorSessionId: 'session-1',
                type: 'note',
                content: 'Carry me into export',
                createdAt: 999,
            }],
        })], COLUMNS);
        const parsed = JSON.parse(capturedBlobParts[0]);
        expect(parsed.formatVersion).toBe(EXPORT_CACHE_VERSION);
        expect(parsed.teamId).toBe('team-1');
        expect(parsed.teamName).toBe('My Team');
        expect(Array.isArray(parsed.tasks)).toBe(true);
        expect(parsed.tasks[0].comments[0].content).toBe('Carry me into export');
    });

    it('excludes deleted tasks from the downloaded file', () => {
        const tasks = [
            makeTask({ id: 't1', title: 'Keep' }),
            makeTask({ id: 't2', title: 'Deleted', isDeleted: true }),
        ];
        exportTasksToJson('team-1', 'My Team', tasks, COLUMNS);
        const parsed = JSON.parse(capturedBlobParts[0]);
        expect(parsed.tasks).toHaveLength(1);
        expect(parsed.tasks[0].id).toBe('t1');
    });

    it('strips execution-specific fields in the downloaded snapshot', () => {
        const task = makeTask({
            assigneeId: 'sess-x',
            approvalStatus: 'pending',
        });
        exportTasksToJson('team-1', 'My Team', [task], COLUMNS);
        const parsed = JSON.parse(capturedBlobParts[0]);
        expect(parsed.tasks[0]).not.toHaveProperty('assigneeId');
        expect(parsed.tasks[0]).not.toHaveProperty('approvalStatus');
    });
});

// ── importSnapshotFromJson ────────────────────────────────────────────────────

describe('importSnapshotFromJson', () => {
    it('parses a valid snapshot JSON and returns it', () => {
        const snapshot = saveTaskExportSnapshot('team-1', 'My Team', [makeTask()], COLUMNS);
        const result = importSnapshotFromJson(JSON.stringify(snapshot));
        expect(result).not.toBeNull();
        expect(result!.teamId).toBe('team-1');
        expect(result!.tasks).toHaveLength(1);
    });

    it('returns null for malformed JSON', () => {
        expect(importSnapshotFromJson('not json {{{')).toBeNull();
    });

    it('returns null when formatVersion does not match', () => {
        const bad = { formatVersion: 'v999', teamId: 'x', tasks: [] };
        expect(importSnapshotFromJson(JSON.stringify(bad))).toBeNull();
    });

    it('returns null when teamId is missing', () => {
        const bad = { formatVersion: EXPORT_CACHE_VERSION, teamId: '', tasks: [] };
        expect(importSnapshotFromJson(JSON.stringify(bad))).toBeNull();
    });

    it('returns null when tasks is not an array', () => {
        const bad = { formatVersion: EXPORT_CACHE_VERSION, teamId: 'x', tasks: null };
        expect(importSnapshotFromJson(JSON.stringify(bad))).toBeNull();
    });

    it('round-trips with exportTasksToJson output', () => {
        // Simulate: export → user downloads file → user uploads file → import
        // (browser APIs mocked from the exportTasksToJson describe block)
        const snapshot = saveTaskExportSnapshot('team-rt', 'RT Team', [makeTask()], COLUMNS);
        const json = JSON.stringify(snapshot);
        const restored = importSnapshotFromJson(json);
        expect(restored!.teamId).toBe('team-rt');
        expect(restored!.teamName).toBe('RT Team');
        expect(restored!.tasks).toHaveLength(1);
    });
});
