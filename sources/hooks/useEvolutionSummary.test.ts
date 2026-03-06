import { describe, expect, it } from 'vitest';
import { normalizeEvolutionSummaryResponse } from './evolutionSummary.shared';

describe('normalizeEvolutionSummaryResponse', () => {
    it('fills safe defaults and keeps recommendation evidence traceable', () => {
        const result = normalizeEvolutionSummaryResponse({
            teamId: 'team-1',
            score: { current: 4.2, delta: -0.3, trend: 'down' },
            evidenceCounts: { code: 2, review: 1 },
            recommendations: [
                {
                    id: 'rec-1',
                    title: 'Clear review backlog',
                    priority: 'high',
                    why: ['Two reviews are pending.'],
                    evidence: [{ id: 'ev-1', category: 'review', title: 'Pending review', summary: 'Task A is awaiting sign-off.' }],
                },
            ],
        }, 'team-1');

        expect(result.teamId).toBe('team-1');
        expect(result.score.current).toBe(4.2);
        expect(result.score.previous).toBe(0);
        expect(result.evidenceCounts.code).toBe(2);
        expect(result.evidenceCounts.collaboration).toBe(0);
        expect(result.recommendations[0].evidence[0].teamId).toBe('team-1');
        expect(result.memory.summary).toContain('warming up');
    });
});
