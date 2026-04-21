import { describe, expect, it } from 'vitest';

import { normalizeRequestedRuntime, resolveSessionReportedRuntime, validateSpawnedSessionRuntime } from './spawnRuntimeGuard';

describe('spawnRuntimeGuard', () => {
    it('normalizes claude and codex runtimes only', () => {
        expect(normalizeRequestedRuntime('claude')).toBe('claude');
        expect(normalizeRequestedRuntime('codex')).toBe('codex');
        expect(normalizeRequestedRuntime('implementer')).toBeNull();
    });

    it('extracts the reported runtime from session metadata flavor', () => {
        expect(resolveSessionReportedRuntime({
            metadata: {
                flavor: 'codex',
            } as any,
        })).toBe('codex');
    });

    it('accepts a codex spawn only when the hydrated session reports codex', () => {
        expect(validateSpawnedSessionRuntime('codex', {
            id: 'session-codex',
            metadata: {
                flavor: 'codex',
            } as any,
        })).toEqual({
            ok: true,
            actualRuntime: 'codex',
        });
    });

    it('rejects a codex spawn when the hydrated session reports claude', () => {
        expect(validateSpawnedSessionRuntime('codex', {
            id: 'session-mismatch',
            metadata: {
                flavor: 'claude',
            } as any,
        })).toEqual({
            ok: false,
            actualRuntime: 'claude',
            error: 'Session session-mismatch reported runtime "claude" instead of requested "codex".',
        });
    });

    it('rejects a codex spawn when the hydrated session never reports a runtime', () => {
        expect(validateSpawnedSessionRuntime('codex', {
            id: 'session-unknown',
            metadata: {} as any,
        })).toEqual({
            ok: false,
            actualRuntime: null,
            error: 'Session session-unknown has not reported a codex runtime yet.',
        });
    });

    it('allows claude requests to stay active when runtime metadata is still missing', () => {
        expect(validateSpawnedSessionRuntime('claude', {
            id: 'session-claude',
            metadata: {} as any,
        })).toEqual({
            ok: true,
            actualRuntime: null,
        });
    });
});
