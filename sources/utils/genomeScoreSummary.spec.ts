import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadModule() {
    process.env.EXPO_PUBLIC_GENOME_HUB_URL = 'http://localhost:3007';
    vi.resetModules();
    return import('./genomeScoreSummary');
}

describe('getGenomeScoreSummary', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.EXPO_PUBLIC_GENOME_HUB_URL = 'http://localhost:3007';
    });

    it('prefers aggregate feedback data when present', async () => {
        const { getGenomeScoreSummary } = await loadModule();

        expect(getGenomeScoreSummary(
            {
                feedbackData: JSON.stringify({
                    evaluationCount: 4,
                    avgScore: 83,
                    sessionScore: { taskCompletion: 80, codeQuality: 84, collaboration: 85, overall: 83 },
                    dimensions: {
                        delivery: 80,
                        integrity: 82,
                        efficiency: 84,
                        collaboration: 85,
                        reliability: 83,
                    },
                    distribution: { excellent: 1, good: 3, fair: 0, poor: 0 },
                    latestAction: 'keep',
                    suggestions: [],
                }),
            },
            {
                resume: {
                    performanceRating: 61,
                    totalSessions: 2,
                },
            }
        )).toEqual({
            avgScore: 83,
            evaluationCount: 4,
            hasFeedback: true,
        });
    });

    it('falls back to resume stats when feedback is missing', async () => {
        const { getGenomeScoreSummary } = await loadModule();

        expect(getGenomeScoreSummary(
            { feedbackData: null },
            {
                resume: {
                    performanceRating: 74,
                    totalSessions: 6,
                },
            }
        )).toEqual({
            avgScore: 74,
            evaluationCount: 6,
            hasFeedback: false,
        });
    });

    it('returns null stats when neither feedback nor resume data exists', async () => {
        const { getGenomeScoreSummary } = await loadModule();

        expect(getGenomeScoreSummary(
            { feedbackData: null },
            null
        )).toEqual({
            avgScore: null,
            evaluationCount: null,
            hasFeedback: false,
        });
    });
});
