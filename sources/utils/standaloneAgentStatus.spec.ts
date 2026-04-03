import { describe, expect, it } from 'vitest';

import { getStandaloneAgentStatusVisual } from './standaloneAgentStatus';

describe('getStandaloneAgentStatusVisual', () => {
    it('prefers live session presence over stored agent lifecycle status', () => {
        const result = getStandaloneAgentStatusVisual(
            { status: 'active' },
            { active: false, activeAt: Date.now() - (5 * 60 * 1000) },
        );

        expect(result).toEqual({
            dotColor: '#8A7F74',
            liveState: 'offline',
        });
    });

    it('maps active agent without session to online', () => {
        expect(getStandaloneAgentStatusVisual({ status: 'active' }, null)).toEqual({
            dotColor: '#22C55E',
            liveState: 'online',
        });
    });

    it('maps paused agent without session to offline', () => {
        expect(getStandaloneAgentStatusVisual({ status: 'paused' }, null)).toEqual({
            dotColor: '#8A7F74',
            liveState: 'offline',
        });
    });

    it('maps archived agent without session to ended', () => {
        expect(getStandaloneAgentStatusVisual({ status: 'archived' }, null)).toEqual({
            dotColor: '#4A4040',
            liveState: 'ended',
        });
    });

    it('maps pending lifecycle without session to offline', () => {
        expect(getStandaloneAgentStatusVisual({
            status: 'active',
            lifecycle: { runStatus: 'pending' },
        }, null)).toEqual({
            dotColor: '#8A7F74',
            liveState: 'offline',
        });
    });

    it('maps failed lifecycle without session to ended', () => {
        expect(getStandaloneAgentStatusVisual({
            status: 'active',
            lifecycle: { runStatus: 'failed' },
        }, null)).toEqual({
            dotColor: '#B45309',
            liveState: 'ended',
        });
    });
});
