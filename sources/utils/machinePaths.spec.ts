import { describe, expect, it, vi } from 'vitest';

import type { RecentMachinePath } from './machinePaths';
import { getPreferredMachineId } from './getPreferredMachineId';
import type { Machine } from '@/sync/storageTypes';

function createMachine(overrides: Partial<Machine> & Pick<Machine, 'id'>): Machine {
    return {
        seq: 1,
        createdAt: 0,
        updatedAt: 0,
        active: false,
        activeAt: 0,
        metadata: {
            host: `${overrides.id}.local`,
            platform: 'darwin',
        },
        metadataVersion: 1,
        daemonState: null,
        daemonStateVersion: 1,
        ...overrides,
    };
}

describe('getPreferredMachineId', () => {
    it('prefers the most recent online machine from cached paths', () => {
        const machines = [
            createMachine({ id: 'machine-a', active: true }),
            createMachine({ id: 'machine-b', active: true }),
        ];
        const recentPaths: RecentMachinePath[] = [
            { machineId: 'machine-b', path: '/Users/me/project-b' },
            { machineId: 'machine-a', path: '/Users/me/project-a' },
        ];

        expect(getPreferredMachineId(machines, recentPaths)).toBe('machine-b');
    });

    it('falls back to another online machine when the most recent machine is offline', () => {
        const machines = [
            createMachine({ id: 'machine-a', active: false }),
            createMachine({ id: 'machine-b', active: true }),
        ];
        const recentPaths: RecentMachinePath[] = [
            { machineId: 'machine-a', path: '/Users/me/project-a' },
        ];

        expect(getPreferredMachineId(machines, recentPaths)).toBe('machine-b');
    });

    it('keeps the recent machine when every available machine is offline', () => {
        const now = new Date('2026-03-31T12:00:00.000Z').getTime();
        vi.useFakeTimers();
        try {
            vi.setSystemTime(now);

            const machines = [
                createMachine({ id: 'machine-a', active: false, activeAt: now - 10 * 60 * 1000 }),
                createMachine({ id: 'machine-b', active: false, activeAt: now - 10 * 60 * 1000 }),
            ];
            const recentPaths: RecentMachinePath[] = [
                { machineId: 'machine-b', path: '/Users/me/project-b' },
            ];

            expect(getPreferredMachineId(machines, recentPaths)).toBe('machine-b');
        } finally {
            vi.useRealTimers();
        }
    });

    it('returns the first machine when there is no recent-path history', () => {
        const machines = [
            createMachine({ id: 'machine-a', active: false }),
            createMachine({ id: 'machine-b', active: false }),
        ];

        expect(getPreferredMachineId(machines, [])).toBe('machine-a');
    });

    it('returns null when there are no machines', () => {
        expect(getPreferredMachineId([], [])).toBeNull();
    });
});
