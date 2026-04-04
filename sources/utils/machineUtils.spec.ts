import { describe, expect, it, vi } from 'vitest';

import type { Machine } from '@/sync/storageTypes';
import { getMachineDaemonStatus, resolveMachineArchivedAt } from './machineUtils';

function createMachine(overrides: Partial<Machine> = {}): Machine {
    return {
        id: 'machine-1',
        seq: 1,
        createdAt: 0,
        updatedAt: 0,
        active: false,
        activeAt: 0,
        archivedAt: null,
        metadata: {
            host: 'machine.local',
            platform: 'darwin',
        },
        metadataVersion: 1,
        daemonState: null,
        daemonStateVersion: 1,
        ...overrides,
    };
}

describe('machineUtils', () => {
    it('treats an explicit null archivedAt update as an unarchive', () => {
        const currentMachine = createMachine({ archivedAt: 1_717_171_717_000 });

        expect(resolveMachineArchivedAt({ archivedAt: null }, currentMachine)).toBeNull();
    });

    it('preserves the existing archivedAt when the update omits the field', () => {
        const currentMachine = createMachine({ archivedAt: 1_717_171_717_000 });

        expect(resolveMachineArchivedAt({}, currentMachine)).toBe(1_717_171_717_000);
    });

    it('returns a stable daemon status enum instead of UI text', () => {
        const now = new Date('2026-04-04T12:00:00.000Z').getTime();
        vi.useFakeTimers();
        try {
            vi.setSystemTime(now);

            expect(getMachineDaemonStatus(null)).toBe('unknown');
            expect(getMachineDaemonStatus(createMachine({
                metadata: {
                    host: 'machine.local',
                    platform: 'darwin',
                    daemonLastKnownStatus: 'shutting-down',
                },
            }))).toBe('stopped');
            expect(getMachineDaemonStatus(createMachine({ active: true }))).toBe('likely_alive');
        } finally {
            vi.useRealTimers();
        }
    });
});
