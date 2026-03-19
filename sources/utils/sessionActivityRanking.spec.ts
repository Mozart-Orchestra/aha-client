import { describe, expect, it } from 'vitest';

import {
    buildSessionActivityMetrics,
    compareAgentSidebarEntries,
    formatTokenRateLabel,
    getStableSessionOrder,
    getTokenRateBucket,
} from './sessionActivityRanking';

function createSession(overrides: Record<string, any> = {}) {
    return {
        id: 'session-1',
        createdAt: 1000,
        metadata: null,
        latestUsage: null,
        ...overrides,
    };
}

describe('sessionActivityRanking', () => {
    it('computes a smoothed token rate from successive usage snapshots', () => {
        const first = buildSessionActivityMetrics([
            createSession({
                id: 'agent-a',
                latestUsage: {
                    inputTokens: 600,
                    outputTokens: 200,
                    cacheCreation: 0,
                    cacheRead: 0,
                    contextSize: 800,
                    timestamp: 10000,
                },
            }),
        ], new Map(), 10000);

        expect(first.metrics.get('agent-a')?.tokenRate).toBe(0);
        expect(first.metrics.get('agent-a')?.tokenRateBucket).toBe(0);

        const second = buildSessionActivityMetrics([
            createSession({
                id: 'agent-a',
                latestUsage: {
                    inputTokens: 1100,
                    outputTokens: 500,
                    cacheCreation: 0,
                    cacheRead: 0,
                    contextSize: 1600,
                    timestamp: 12000,
                },
            }),
        ], first.snapshots, 12000);

        expect(second.metrics.get('agent-a')?.tokenRate).toBe(400);
        expect(second.metrics.get('agent-a')?.tokenRateBucket).toBe(3);
    });

    it('decays stale rates instead of keeping agents permanently hot', () => {
        const seededSnapshots = new Map([
            ['agent-a', {
                totalTokens: 1600,
                usageTimestamp: 12000,
                smoothedRate: 180,
            }],
        ]);

        const result = buildSessionActivityMetrics([
            createSession({
                id: 'agent-a',
                latestUsage: {
                    inputTokens: 1100,
                    outputTokens: 500,
                    cacheCreation: 0,
                    cacheRead: 0,
                    contextSize: 1600,
                    timestamp: 12000,
                },
            }),
        ], seededSnapshots, 60000);

        expect(result.metrics.get('agent-a')?.tokenRate).toBe(0);
        expect(result.metrics.get('agent-a')?.tokenRateBucket).toBe(0);
    });

    it('sorts by activity bucket before falling back to stable spawn order', () => {
        const entries = [
            {
                name: 'Gamma',
                inactive: false,
                dead: false,
                tokenRateBucket: 2,
                stableOrder: 30,
            },
            {
                name: 'Alpha',
                inactive: false,
                dead: false,
                tokenRateBucket: 2,
                stableOrder: 10,
            },
            {
                name: 'Beta',
                inactive: false,
                dead: false,
                tokenRateBucket: 3,
                stableOrder: 20,
            },
            {
                name: 'Offline',
                inactive: true,
                dead: false,
                tokenRateBucket: 3,
                stableOrder: 5,
            },
        ];

        expect(entries.sort(compareAgentSidebarEntries).map((entry) => entry.name)).toEqual([
            'Beta',
            'Alpha',
            'Gamma',
            'Offline',
        ]);
    });

    it('exposes stable helper labels for the sidebar chip', () => {
        expect(getTokenRateBucket(9.9)).toBe(0);
        expect(getTokenRateBucket(75)).toBe(2);
        expect(formatTokenRateLabel(1250)).toBe('1.3K tok/s');
        expect(getStableSessionOrder(createSession({ metadata: { processStartedAt: 42 } }))).toBe(42);
    });
});
