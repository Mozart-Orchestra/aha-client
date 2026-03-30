import { parseAgentVerdict, type AgentImage, type GenomeRecord } from '@/utils/genomeHub';

export type GenomeScoreSummary = {
    avgScore: number | null;
    evaluationCount: number | null;
    hasFeedback: boolean;
};

export function getGenomeScoreSummary(
    genome: Pick<GenomeRecord, 'feedbackData'> | null | undefined,
    spec: Pick<AgentImage, 'resume'> | null | undefined
): GenomeScoreSummary {
    const feedback = parseAgentVerdict(genome?.feedbackData ?? null);

    return {
        avgScore: feedback?.avgScore ?? spec?.resume?.performanceRating ?? null,
        evaluationCount: feedback?.evaluationCount ?? spec?.resume?.totalSessions ?? null,
        hasFeedback: feedback != null,
    };
}
