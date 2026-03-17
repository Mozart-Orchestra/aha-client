import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MachineActivityUpdate } from './machineActivityAccumulator';
import { MachineActivityAccumulator } from './machineActivityAccumulator';

describe('MachineActivityAccumulator', () => {
    let flushHandler: ReturnType<typeof vi.fn>;
    let accumulator: MachineActivityAccumulator;

    beforeEach(() => {
        vi.useFakeTimers();
        flushHandler = vi.fn();
        accumulator = new MachineActivityAccumulator(flushHandler, 2000);
    });

    afterEach(() => {
        accumulator.cancel();
        vi.useRealTimers();
    });

    it('debounces rapid machine-activity updates into a single flush per debounce window', () => {
        const updates: MachineActivityUpdate[] = Array.from({ length: 10 }, (_, index) => ({
            type: 'machine-activity',
            id: 'machine-1',
            active: true,
            activeAt: 1000 + index,
        }));

        updates.forEach((update) => accumulator.addUpdate(update));

        expect(flushHandler).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1999);
        expect(flushHandler).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(flushHandler).toHaveBeenCalledTimes(1);

        const flushed = flushHandler.mock.calls[0][0] as Map<string, MachineActivityUpdate>;
        expect(flushed.size).toBe(1);
        expect(flushed.get('machine-1')).toEqual(updates[updates.length - 1]);
    });

    it('batches the latest update for each machine into the same flush', () => {
        accumulator.addUpdate({
            type: 'machine-activity',
            id: 'machine-1',
            active: true,
            activeAt: 1000,
        });
        accumulator.addUpdate({
            type: 'machine-activity',
            id: 'machine-2',
            active: true,
            activeAt: 1001,
        });
        accumulator.addUpdate({
            type: 'machine-activity',
            id: 'machine-1',
            active: false,
            activeAt: 1002,
        });

        vi.advanceTimersByTime(2000);

        expect(flushHandler).toHaveBeenCalledTimes(1);
        const flushed = flushHandler.mock.calls[0][0] as Map<string, MachineActivityUpdate>;
        expect(flushed.get('machine-1')).toEqual({
            type: 'machine-activity',
            id: 'machine-1',
            active: false,
            activeAt: 1002,
        });
        expect(flushed.get('machine-2')).toEqual({
            type: 'machine-activity',
            id: 'machine-2',
            active: true,
            activeAt: 1001,
        });
    });
});
