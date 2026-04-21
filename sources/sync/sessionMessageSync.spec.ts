import { describe, expect, it, vi } from 'vitest';
import { stopMissingSessionMessageSync } from './sessionMessageSync';

describe('stopMissingSessionMessageSync', () => {
    it('stops and removes message syncs when the session messages endpoint returns 404', () => {
        const stop = vi.fn();
        const cleanup = vi.fn();
        const warn = vi.fn();
        const registry = new Map<string, { stop: () => void }>([
            ['session-404', { stop }],
        ]);

        const handled = stopMissingSessionMessageSync(
            registry as Pick<Map<string, any>, 'get' | 'delete'>,
            'session-404',
            404,
            cleanup,
            warn,
        );

        expect(handled).toBe(true);
        expect(stop).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(registry.has('session-404')).toBe(false);
        expect(warn).toHaveBeenCalledWith(
            'Session session-404 messages endpoint returned 404; stopping message sync for this session.',
        );
    });

    it('leaves message syncs untouched for non-404 responses', () => {
        const stop = vi.fn();
        const cleanup = vi.fn();
        const warn = vi.fn();
        const registry = new Map<string, { stop: () => void }>([
            ['session-ok', { stop }],
        ]);

        const handled = stopMissingSessionMessageSync(
            registry as Pick<Map<string, any>, 'get' | 'delete'>,
            'session-ok',
            500,
            cleanup,
            warn,
        );

        expect(handled).toBe(false);
        expect(stop).not.toHaveBeenCalled();
        expect(cleanup).not.toHaveBeenCalled();
        expect(registry.has('session-ok')).toBe(true);
        expect(warn).not.toHaveBeenCalled();
    });
});
